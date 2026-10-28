# SEARCHIVO

**Fast search. Simple API.**

TypeScript-first, modular search. Angular is the first planned framework integration; core never depends on Angular.

This is a new rebuild, not recovered historical source. The original implementation and its reported evidence are unavailable. Current code and checks alone define implemented capabilities.

## Development

Node 24.22.1, pnpm 11.28.9. Run `pnpm install`, then `pnpm check`.
Packages are private and unpublished. No npm installation or compatibility claim is made yet.

## 30-second example

```ts
import { createSearchEngine } from "@searchivo/core";

type Product = { id: number; name: string; description: string };
const search = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: { boost: 1 } },
});
search.add([
  { id: 1, name: "Apple iPhone 15 Pro", description: "Premium smartphone" },
]);
const results = search.search("iphone");
// [{ id: 1, document: ..., score: 3 }]
```

The [executable example](examples/core.ts) is compiled against the actual packed tarball and run by `pnpm check`.

## Implemented

Portable zero-dependency core with typed configuration, Unicode NFKC tokenization, inverted-index exact OR retrieval, positive field boosts, stable weighted ranking, atomic validated add/upsert, remove/clear and index statistics. IDs are nonempty strings or finite numbers; numeric and string IDs are distinct. Duplicate add IDs reject the entire batch. Upserts retain insertion-order tie priority. Results contain frozen shallow document copies; nested data remains caller-owned.

Workers, HTTP adapters, DevTools, themes and website are not implemented yet. There is no deployed docs/playground URL. The rebuild follows the linked Notion milestones; historical completion claims do not apply.

## Angular

`@searchivo/angular` provides `createSearchivo(source)` with typed scoped providers and Signals, plus standalone `SearchivoInputDirective` for `<input searchivo>`. Add `binding.provide()` to component providers, the directive to imports, and retrieve the handle with `binding.inject()`. Developers own the label and markup. IME composition is preserved and scope destruction cancels pending work. See the [Angular guide](packages/angular/README.md) and [runnable OnPush/zoneless example](apps/angular-example/src/main.ts). Build it with `pnpm build:example` and run `node scripts/serve.mjs` for a local preview on port 4173.

## Validation and measurements

Optional autocomplete, async suggestion groups and cancellable state are available from `@searchivo/core/suggestions`, `/source` and `/state`. `createSearchState(localSource(engine))` exposes query, results, loading, error, total, facets and duration, with abort and generation guards. Debounce uses an injected scheduler; see [ownership and lifecycle](docs/adr/0006-state.md).

`@searchivo/core/refinements` provides `refine(hits, options)` for typed equality, membership and numeric ranges, conjunctive pre-pagination facets, stable sorting and offset/limit pages. See [refinement semantics](docs/adr/0005-refinements.md).

Optional `@searchivo/core/fuzzy` exports `createFuzzySearch(engine)` for bounded one-edit corrections, and `@searchivo/core/highlight` exports `highlight(text, query)` for original UTF-16 ranges. See [limits and Unicode semantics](docs/adr/0004-fuzzy-highlights.md). These modules are absent from the basic consumer bundle.

Optional [BM25](docs/adr/0003-ranking.md) is available from `@searchivo/core/bm25`: pass `ranking: bm25({ k1: 1.2, b: 0.75 })` at construction. Custom pure per-field scoring functions receive corpus statistics. The base entry point does not import BM25. Invalid or overflowing scores fail explicitly.

`pnpm check` checks formatting/lint, strict types, per-file 100% library coverage, dependency boundaries, packed ESM/declaration/doc consumers, Angular APF/strict-AOT consumers and a 5KB gzip core budget. `pnpm audit --audit-level=low` checks dependencies. Current tests exercise Node 24.22.1, TypeScript 6.0.3 and Angular 22.2.3 only. `pnpm build:example && pnpm test:browser` runs Chromium behavior and axe accessibility checks; these do not prove universal accessibility or field Core Web Vitals.

See [benchmark methodology](benchmarks/README.md), [raw reports](benchmarks/reports), and [index semantics/complexity](docs/adr/0002-index.md). Seeded 1k/10k/100k workloads distinguish repeated vocabulary from high-cardinality dictionaries. Post-index heap samples are not peak-memory measurements. No performance regression baseline has yet been established.

[Source](https://github.com/yovi-labs/searchivo/tree/develop) · [Project tracker](https://app.notion.com/p/3f216fa3a42381689ffbd9169bea07ae)
