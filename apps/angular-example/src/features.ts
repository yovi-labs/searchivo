import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  Directive,
  inject,
  signal,
} from "@angular/core";
import { JsonPipe } from "@angular/common";
import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { createFuzzySearch } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
import { refine } from "@searchivo/core/refinements";
import {
  createAutocomplete,
  groupedSuggestions,
} from "@searchivo/core/suggestions";
import { createCancellation, type SearchSource } from "@searchivo/core/source";
import { createDebouncer } from "@searchivo/core/state";
import { explainSearch } from "@searchivo/core/explain";
import {
  createSearchivo,
  SEARCHIVO_INPUT,
  SearchivoInputDirective,
  type SearchivoInput,
} from "@searchivo/angular";
import { createWorkerClient } from "@searchivo/workers/client";
import { webTransport } from "@searchivo/workers/web";
import { createHttpSource } from "@searchivo/adapters";
import { recordSearch } from "@searchivo/devtools";
import { products, isProduct, type Product } from "./features-data.js";
const scope = createSearchivo<Product>((request, signal) =>
  activeSource(request, signal),
);
let activeSource: SearchSource<Product> = () => ({
  results: [],
  total: 0,
  facets: {},
});
/** Reuse the native directive's IME handling with the catalog's debounce policy. */
@Directive({
  selector: "input[labCatalog]",
  standalone: true,
  hostDirectives: [SearchivoInputDirective],
  providers: [
    {
      provide: SEARCHIVO_INPUT,
      useFactory: () => inject(Features).catalogBinding,
    },
  ],
  host: { "(compositionstart)": "cancel()" },
})
class CatalogInputDirective {
  private readonly lab = inject(Features);
  cancel() {
    this.lab.cancel();
  }
}
@Component({
  selector: "app-root",
  standalone: true,
  imports: [JsonPipe, SearchivoInputDirective, CatalogInputDirective],
  providers: [
    ...scope.provide(),
    {
      provide: SEARCHIVO_INPUT,
      useFactory: () => inject(Features).inputBinding,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="searchivo-theme">
    <p>SEARCHIVO / ANGULAR FEATURE LAB</p>
    <h1>Search, inspect, integrate.</h1>
    <p>
      Standalone Angular · Signals · OnPush · zoneless. Four synthetic fixtures.
    </p>
    <nav aria-label="Examples">
      <a href="/#minimal">Minimal directive example</a> ·
      <a href="/#catalog">10,000-product catalog</a> ·
      <a href="https://searchivo.netlify.app/docs/">Documentation</a>
    </nav>
    <section aria-label="Configuration">
      <label
        >Maximum price
        <input
          aria-label="Maximum price"
          type="number"
          min="0"
          [value]="maxPrice"
          (change)="maxPrice = +$any($event.target).value; run()"
      /></label>
      <label
        >Source
        <select
          aria-label="Source"
          [value]="mode"
          (change)="mode = $any($event.target).value; run()"
        >
          <option>local</option>
          <option>worker</option>
          <option>http</option>
          <option>invalid-http</option>
          <option>slow</option>
        </select></label
      >
      <label
        >Ranking
        <select
          aria-label="Ranking"
          (change)="ranking = $any($event.target).value; rebuild()"
        >
          <option>BM25</option>
          <option>Weighted</option>
        </select></label
      >
      <label
        >Name boost
        <input
          aria-label="Name boost"
          type="number"
          min="0.1"
          step="0.1"
          [value]="boost"
          (change)="setBoost($any($event.target).value)"
      /></label>
      <label
        ><input
          type="checkbox"
          (change)="fuzzy = $any($event.target).checked; run()"
        />Fuzzy matching</label
      >
      <label
        >Category
        <select
          aria-label="Category"
          (change)="category = $any($event.target).value; run()"
        >
          <option value="">All</option>
          <option>Phones</option>
          <option>Computers</option>
        </select></label
      >
      <label
        >Sort
        <select
          aria-label="Sort"
          (change)="sort = $any($event.target).value; run()"
        >
          <option>Relevance</option>
          <option>Price</option>
        </select></label
      >
      <label
        >Page size
        <select
          aria-label="Page size"
          (change)="limit = +$any($event.target).value; offset = 0; run()"
        >
          <option>2</option>
          <option>1</option>
          <option>4</option>
        </select></label
      >
    </section>
    <section>
      <label for="lab-query">Search feature catalog</label
      ><input id="lab-query" type="search" labCatalog />
      <p>
        100 ms debounce. Worker/HTTP fixtures use BM25 with boost 3; fuzzy
        expansion, refinements and explanations run locally.
      </p>
      @for (group of groups(); track group.label) {
        <div>
          {{ group.label }}:
          @for (term of group.suggestions; track term) {
            <button (click)="setQuery(term)">{{ term }}</button>
          }
        </div>
      }
      <p role="status">
        {{
          handle.state().loading
            ? "Searching…"
            : handle.state().total + " matches"
        }}{{ handle.state().error ? " · Search failed" : "" }}
      </p>
      <button (click)="cancel()">Cancel</button
      ><button (click)="race()">Test stale response</button>
      @for (hit of handle.state().results; track hit.id) {
        <article>
          <h2>
            @for (part of parts(hit.document.name); track $index) {
              @if (part.match) {
                <mark>{{ part.text }}</mark>
              } @else {
                {{ part.text }}
              }
            }
          </h2>
          <p>
            {{ hit.document.category }} · {{ hit.document.price }} USD · score
            {{ hit.score }}
          </p>
        </article>
      }
      <button
        [disabled]="offset === 0"
        (click)="offset = offset - limit; run(false)"
      >
        Previous page</button
      ><button
        [disabled]="offset + limit >= handle.state().total"
        (click)="offset = offset + limit; run(false)"
      >
        Next page
      </button>
      <p>Facets: {{ handle.state().facets | json }}</p>
    </section>
    <section>
      <h2>Mutations</h2>
      <button (click)="mutate('add')">Add document</button
      ><button (click)="mutate('upsert')">Update document</button
      ><button (click)="mutate('remove')">Remove document</button
      ><button (click)="mutate('clear')">Clear index</button
      ><button (click)="resetIndex()">Reset index</button>
      <p>{{ engine.stats() | json }}</p>
      <p>
        Mutations affect the local engine. Worker/HTTP use independent fixture
        indexes.
      </p>
    </section>
    <section>
      <h2>Directive synchronization</h2>
      <label for="bound">Bound query</label
      ><input id="bound" searchivo type="search" /><button
        (click)="setQuery('Pixel')"
      >
        Programmatic Pixel
      </button>
      <p>
        Both inputs share the query and refinements. The feature catalog input
        adds a 100 ms debounce; both preserve IME composition.
      </p>
    </section>
    <details>
      <summary>Explain Search</summary>
      <pre tabindex="0">{{ explanation() | json }}</pre>
    </details>
    <details>
      <summary>DevTools transitions</summary>
      <button (click)="recorder.clear(); run()">Clear recorder</button>
      <pre tabindex="0">{{ records() | json }}</pre>
    </details>
  </main>`,
  styles: [
    `
      :host {
        display: block;
        background: #0b1220;
        color: #f4f6fc;
        min-height: 100vh;
        font: 16px/1.6 system-ui;
      }
      main {
        max-width: 1100px;
        margin: auto;
        padding: 32px;
      }
      section {
        padding: 20px 0;
        border-bottom: 1px solid #40516b;
      }
      label {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        margin: 8px;
      }
      a {
        color: #ff98ce;
      }
      button {
        margin: 6px;
      }
      pre {
        overflow: auto;
        max-height: 360px;
      }
      article {
        border: 1px solid #40516b;
        padding: 16px;
        margin: 12px 0;
      }
      h1 {
        font-size: 42px;
      }
      label {
        flex-wrap: wrap;
      }
      input,
      select {
        max-width: 100%;
      }
    `,
  ],
})
export class Features {
  readonly handle = scope.inject();
  ranking = "BM25";
  boost = 3;
  private documents = new Map(products.map((product) => [product.id, product]));
  engine = this.makeEngine();
  private fuzzySearch = createFuzzySearch(this.engine);
  private autocomplete = createAutocomplete(this.engine);
  fuzzy = false;
  mode = "local";
  category = "";
  maxPrice = 2000;
  sort = "Relevance";
  readonly query = signal("");
  readonly inputBinding: SearchivoInput = {
    query: this.query.asReadonly(),
    setQuery: (query) => this.setQuery(query),
  };
  readonly catalogBinding: SearchivoInput = {
    query: this.query.asReadonly(),
    setQuery: (query) => this.input(query),
  };
  offset = 0;
  limit = 2;
  readonly explanation = signal<unknown>(null);
  readonly groups = signal<Awaited<ReturnType<typeof groupedSuggestions>>>([]);
  readonly records = signal<unknown>([]);
  readonly recorder = recordSearch(this.handle.controller);
  private worker: ReturnType<typeof createWorkerClient<Product>> | undefined;
  private cancellation = createCancellation();
  private readonly debounce = createDebouncer(
    () => this.run(),
    (callback, delay) => {
      const timer = setTimeout(callback, delay);
      return () => clearTimeout(timer);
    },
    100,
  );
  constructor() {
    activeSource = async (request, signal) => {
      const expanded = this.fuzzy
        ? this.fuzzySearch(request.query).terms.join(" ")
        : request.query;
      let hits;
      if (this.mode === "worker") {
        if (!this.worker) {
          const instance = new Worker("/feature-worker.js", { type: "module" });
          this.worker = createWorkerClient(
            webTransport(instance, () => instance.terminate()),
            isProduct,
            true,
          );
        }
        hits = await this.worker.request("search", expanded, signal);
      } else if (this.mode.includes("http")) {
        const source = createHttpSource({
          endpoint:
            location.origin +
            (this.mode === "invalid-http" ? "/api/invalid" : "/api/search"),
          isDocument: isProduct,
        });
        hits = (await source({ ...request, query: expanded }, signal)).results;
      } else {
        if (this.mode === "slow")
          await new Promise((resolve) =>
            setTimeout(resolve, request.query === "phone" ? 400 : 20),
          );
        hits = this.engine.search(expanded);
      }
      return refine(hits, request);
    };
    const unsubscribe = this.handle.controller.subscribe(() =>
      this.records.set(this.recorder.entries()),
    );
    inject(DestroyRef).onDestroy(() => {
      unsubscribe();
      this.recorder.dispose();
      this.debounce.dispose();
      this.cancellation.abort();
      this.worker?.dispose();
    });
  }
  private makeEngine() {
    return createSearchEngine<Product>(
      {
        id: "id",
        fields: { name: { boost: this.boost }, text: {} },
        ...(this.ranking === "Weighted" ? {} : { ranking: bm25() }),
      },
      [...this.documents.values()],
    );
  }
  rebuild() {
    this.engine = this.makeEngine();
    this.fuzzySearch = createFuzzySearch(this.engine);
    this.autocomplete = createAutocomplete(this.engine);
    this.run();
  }
  resetIndex() {
    this.documents = new Map(products.map((product) => [product.id, product]));
    this.rebuild();
  }
  setBoost(value: string) {
    const boost = Number(value);
    if (Number.isFinite(boost) && boost > 0) {
      this.boost = boost;
      this.rebuild();
    }
  }
  input(query: string) {
    this.cancel();
    this.query.set(query);
    this.debounce.submit(undefined);
  }
  setQuery(query: string) {
    this.query.set(query);
    this.run();
  }
  cancel() {
    this.debounce.cancel();
    this.cancellation.abort();
    this.handle.controller.cancel();
  }
  run(reset = true) {
    this.debounce.cancel();
    if (reset) this.offset = 0;
    this.cancellation.abort();
    this.cancellation = createCancellation();
    void groupedSuggestions(
      [
        {
          label: "Dictionary",
          suggest: async (query) => this.autocomplete(query),
        },
        {
          label: "Quick queries",
          suggest: async (query) =>
            ["phone", "laptop"].filter((term) => term.startsWith(query)),
        },
      ],
      this.query(),
      this.cancellation.signal,
    )
      .then((groups) => this.groups.set(groups))
      .catch(() => {});
    this.explanation.set(
      explainSearch(
        this.engine,
        this.query(),
        this.fuzzy
          ? {
              expandedTerms: this.fuzzySearch(this.query()).terms,
            }
          : {},
      ),
    );
    void this.handle.controller.search({
      query: this.query(),
      filters: [
        ...(this.category
          ? [
              {
                field: "category" as const,
                op: "eq" as const,
                value: this.category,
              },
            ]
          : []),
        { field: "price", op: "range", max: this.maxPrice },
      ],
      facets: ["category"],
      offset: this.offset,
      limit: this.limit,
      ...(this.sort === "Price"
        ? { sort: { field: "price", direction: "asc" } }
        : {}),
    });
  }
  race() {
    this.mode = "slow";
    this.setQuery("phone");
    this.setQuery("laptop");
  }
  mutate(operation: string) {
    if (operation === "clear") {
      this.engine.clear();
      this.documents.clear();
    } else if (operation === "remove") {
      this.engine.remove(5);
      this.documents.delete(5);
    } else {
      const doc = {
        id: 5,
        name: operation === "upsert" ? "Updated phone" : "Added phone",
        text: "phone",
        price: 100,
        category: "Phones",
      };
      if (operation === "add") {
        if (!this.documents.has(doc.id)) {
          this.engine.add([doc]);
          this.documents.set(doc.id, doc);
        }
      } else {
        this.engine.upsert([doc]);
        this.documents.set(doc.id, doc);
      }
    }
    this.run();
  }
  parts(text: string) {
    const ranges = highlight(text, this.query());
    let cursor = 0;
    const parts: { text: string; match: boolean }[] = [];
    for (const range of ranges) {
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
