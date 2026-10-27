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

Angular integration, fuzzy matching, refinements, suggestions, workers, adapters, DevTools, themes and website are not implemented yet. There is no deployed docs/playground URL. The rebuild follows the linked Notion milestones; historical completion claims do not apply.

## Validation and measurements

`pnpm check` checks formatting, strict types, per-file 100% library coverage, dependency boundaries, packed ESM/declaration/doc consumers and a 5KB gzip core budget. `pnpm audit --audit-level=low` checks dependencies. Current tests run on Node 24.22.1; no broader runtime or Angular compatibility is claimed.

See [benchmark methodology](benchmarks/README.md), [raw reports](benchmarks/reports), and [index semantics/complexity](docs/adr/0002-index.md). Seeded 1k/10k/100k workloads distinguish repeated vocabulary from high-cardinality dictionaries. Post-index heap samples are not peak-memory measurements. No performance regression baseline has yet been established.

[Source](https://github.com/yovi-labs/searchivo/tree/develop) · [Project tracker](https://app.notion.com/p/3f216fa3a42381689ffbd9169bea07ae)
