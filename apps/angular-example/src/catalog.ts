import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from "@angular/core";
import { CurrencyPipe, DecimalPipe } from "@angular/common";
import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { createFuzzySearch } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
import { refine, type Filter } from "@searchivo/core/refinements";
import { createAutocomplete } from "@searchivo/core/suggestions";
import { createDebouncer } from "@searchivo/core/state";
import {
  createSearchivo,
  SEARCHIVO_INPUT,
  SearchivoInputDirective,
  type SearchivoInput,
} from "@searchivo/angular";
import { generateCatalog, type CatalogProduct } from "./catalog-data.js";

const products = generateCatalog();
const started = performance.now();
const engine = createSearchEngine<CatalogProduct>(
  {
    id: "id",
    fields: {
      name: { boost: 4 },
      brand: { boost: 2 },
      id: { boost: 5 },
      description: {},
      category: {},
      color: {},
    },
    ranking: bm25(),
  },
  products,
);
const indexMs = performance.now() - started;
const browse = products.map((document) => ({
  id: document.id,
  document,
  score: 0,
}));
const fuzzy = createFuzzySearch(engine);
const autocomplete = createAutocomplete(engine);
const scope = createSearchivo<CatalogProduct>((request, cancellation) => {
  if (cancellation.aborted) throw new Error("Search cancelled");
  const start = performance.now();
  let hits = request.query.trim() ? engine.search(request.query) : browse;
  let corrected = false;
  if (request.query.trim() && hits.length === 0) {
    hits = fuzzy(request.query).results;
    corrected = hits.length > 0;
  }
  const response = refine(hits, request);
  return {
    ...response,
    metadata: { elapsedMs: performance.now() - start, corrected },
  };
});

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, SearchivoInputDirective],
  providers: [
    ...scope.provide(),
    {
      provide: SEARCHIVO_INPUT,
      useFactory: () => inject(Catalog).inputBinding,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./catalog.html",
  styleUrl: "./catalog.css",
})
export class Catalog {
  readonly search = scope.inject();
  readonly query = signal("");
  readonly suggestions = signal<readonly string[]>([]);
  readonly categories = [
    ...new Set(products.map((product) => product.category)),
  ];
  readonly brands = [
    ...new Set(products.map((product) => product.brand)),
  ].sort();
  readonly indexMs = indexMs;
  readonly pageSize = 24;
  category = "";
  brand = "";
  maxPrice = 1500;
  stockOnly = false;
  sort = "relevance";
  offset = 0;
  readonly inputBinding: SearchivoInput = {
    query: this.query.asReadonly(),
    setQuery: (query) => {
      this.cancel();
      this.query.set(query);
      this.suggestions.set(autocomplete(query, 6));
      this.debounce.submit(undefined);
    },
  };
  private readonly debounce = createDebouncer(
    () => this.run(),
    (callback, delay) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    },
    120,
  );
  constructor() {
    inject(DestroyRef).onDestroy(() => this.debounce.dispose());
    this.run();
  }
  cancel() {
    this.debounce.cancel();
    this.search.controller.cancel();
  }
  setQuery(query: string) {
    this.query.set(query);
    this.suggestions.set([]);
    this.run();
  }
  run(reset = true) {
    this.debounce.cancel();
    if (reset) this.offset = 0;
    const filters: Filter<CatalogProduct>[] = [
      { field: "price", op: "range", max: this.maxPrice },
    ];
    if (this.category)
      filters.push({ field: "category", op: "eq", value: this.category });
    if (this.brand)
      filters.push({ field: "brand", op: "eq", value: this.brand });
    if (this.stockOnly)
      filters.push({ field: "inStock", op: "eq", value: true });
    void this.search.controller.search({
      query: this.query(),
      filters,
      facets: ["category"],
      offset: this.offset,
      limit: this.pageSize,
      ...(this.sort === "relevance"
        ? {}
        : {
            sort: {
              field:
                this.sort === "rating"
                  ? ("rating" as const)
                  : ("price" as const),
              direction:
                this.sort === "price-asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            },
          }),
    });
  }
  reset() {
    this.category = "";
    this.brand = "";
    this.maxPrice = 1500;
    this.stockOnly = false;
    this.sort = "relevance";
    this.setQuery("");
  }
  page(direction: number) {
    this.offset = Math.max(0, this.offset + direction * this.pageSize);
    this.run(false);
  }
  parts(text: string) {
    const parts: { text: string; match: boolean }[] = [];
    let cursor = 0;
    for (const range of highlight(text, this.search.query())) {
      parts.push(
        { text: text.slice(cursor, range.start), match: false },
        { text: text.slice(range.start, range.end), match: true },
      );
      cursor = range.end;
    }
    parts.push({ text: text.slice(cursor), match: false });
    return parts;
  }
}
