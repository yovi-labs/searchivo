# Angular feature lab

A standalone Angular app integrating every Searchivo package with Signals, OnPush and zoneless change detection.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm build:example
node scripts/serve.mjs
```

Open [the local feature lab](http://127.0.0.1:4173/#features). The [minimal directive example](http://127.0.0.1:4173/) remains available.

For hands-on shopping-style search, open [the 10,000-product catalog](http://127.0.0.1:4173/#catalog). It generates deterministic fictional products across eight categories, indexes them with Searchivo BM25, and uses the Angular binding for query state. Try `coffee`, `headphnoes` (typo recovery), `ergonomic chair`, `midnight`, or exact SKU `SKU00001`. Search matches any word; category, brand, maximum price and stock filters narrow results. Sort by price or rating and page through 24 products at a time. Empty queries browse the full collection. Typo recovery runs only when exact retrieval has no hits. Timings show this browser's index construction and retrieval/refinement duration; they are not benchmark claims. Product illustrations, prices, stock and ratings are synthetic; no remote data service or checkout is involved.

| Feature                              | Try it                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| BM25 and field boosts                | Search apple, select Weighted, adjust name boost                  |
| Fuzzy and safe highlights            | Enable fuzzy and search iphnoe                                    |
| Filters, facets, sorting, pagination | Category, maximum price, Price sort, page size                    |
| Autocomplete and grouped suggestions | Type pix and select pixel; input is debounced 100 ms              |
| Angular Signals and input directive  | Bound query and Programmatic Pixel; minimal example preserves IME |
| Mutations and index statistics       | Add, update, remove, clear and reset                              |
| Worker and HTTP                      | Select worker or http; actual protocol/network calls              |
| Errors and cancellation              | invalid-http, slow, Cancel and Test stale response                |
| Explanations and DevTools            | Open the diagnostic disclosures                                   |
| Optional theme                       | Scoped theme CSS and native keyboard controls                     |

After building both examples and website, run `pnpm test:browser`. Browser tests cover these feature families; unit tests cover broader algorithm and API edge cases. This app does not claim exhaustive verification of every API option.

Worker and HTTP use independent fixed BM25 fixture indexes with name boost 3. Mutations and ranking controls affect the local engine. Fuzzy expansion, refinements and explanations remain local; diagnostic explanations describe the local engine. HTTP fixtures exist only in the local preview server, not a production backend. The slow fixture intentionally ignores abort to test generation protection. Four synthetic products are behavior fixtures, not a benchmark.

The isolated strict-AOT tarball consumer is [examples/angular.ts](../../examples/angular.ts). This feature app consumes all packages through the workspace.

Both search inputs share one query Signal and the same refinement pipeline. The catalog adds a 100 ms debounce; the bound input and programmatic button search immediately. Both inputs use the native directive's IME composition handling. Cancel stops pending debounce, suggestions and the active request, and subsequent typing starts a new search.

Ranking and name-boost changes rebuild the local index from its current documents, preserving additions, updates, removals and an empty index. Only Reset index restores the original fixtures. Add document inserts fixture ID 5 when absent, including after Clear index, and leaves an existing ID unchanged.
