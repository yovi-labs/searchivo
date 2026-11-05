# Performance, complexity and measurements

Measure your data and complete interface before optimizing. [Benchmark source](https://github.com/yovi-labs/searchivo/tree/develop/benchmarks) · [raw reports](https://searchivo.netlify.app/benchmarks/) · [live catalog](https://searchivo.netlify.app/#catalog).

## Catalog measurements

`node --expose-gc benchmarks/catalog.mjs before` measured the original implementation; `after` measured the empty-query highlight fast path. Both used the actual 10,000 fictional catalog products, six searchable fields, Node 24.22.1 on the same AMD Ryzen 7 9700X machine, ten warmups and thirty samples. Reports identify their parent revision and dirty worktree honestly. Timings exclude Angular rendering, network and layout. Index/cold timings are single samples. Heap is retained after explicit GC, excludes fixtures and is not peak allocation.

| Operation                                        | Before             | After              |
| ------------------------------------------------ | ------------------ | ------------------ |
| Index construction                               | 90.30 ms           | 89.21 ms           |
| Retained index heap                              | 50,589,344 bytes   | 50,589,344 bytes   |
| Exact BM25 median / p95                          | 0.0747 / 0.0869 ms | 0.0751 / 0.0864 ms |
| Warm fuzzy median / p95                          | 0.1216 / 0.1400 ms | 0.1243 / 0.1485 ms |
| Refinement median / p95                          | 0.0292 / 0.0570 ms | 0.0287 / 0.0637 ms |
| Empty-query highlighting, 24 names, median / p95 | 0.2851 / 0.3742 ms | 0.0034 / 0.0103 ms |

The targeted median highlight workload fell about **98.8%** because empty queries no longer segment every product name. This is a small helper workload, not a 98.8% improvement in complete search. Other differences are noise; no retrieval or index-memory improvement is claimed. Nonempty highlighting uses the same algorithm. Raw [before](../benchmarks/reports/catalog-before.json) and [after](../benchmarks/reports/catalog-after.json) retain samples.

The feature lab now retains fuzzy/autocomplete closures between queries. Revision checks refresh them after mutations; replacing the engine recreates the helpers. This removes a rebuild-on-every-query pattern, with no separate timing percentage claimed for its four-product dataset.

## Actual operation costs

Let `N` denote documents, `F` fields, `C` indexed text size, `V` dictionary terms, `P` term/document pairs, `H` matched documents, `M` postings visited by query terms, `K` filters, `B` summed membership-list lengths, and `A` facet fields. Map operations assume average constant-time lookup. String normalization/comparison and runtime allocation affect constants.

| Operation     | Time and additional space                                                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full indexing | Tokenization scales with text; frequency arrays add `F` work per term/document pair. Expected time/space include `O(C + P·F + N·F)` plus document snapshots/dictionary strings. Batch preparation temporarily stages a full batch.                                         |
| Upsert/remove | Proportional to old/new terms, field lengths and tokenized text, without a full reindex. Mutations invalidate optional dictionaries.                                                                                                                                       |
| Exact query   | Query normalization, `O(M·F)` scoring and `O(H log H)` full-result sorting; scoring/results use `O(H)` space. This ranks every hit before paging.                                                                                                                          |
| Fuzzy         | First query after mutation builds a trie proportional to eligible dictionary code points. Each visited node computes a row proportional to token length (at most 64). Per-token traversal is capped; expanded exact retrieval and trie construction remain separate costs. |
| Highlights    | Empty-token queries stop after tokenization. Otherwise grapheme segmentation, code-unit mappings and output scale with original/normalized text length.                                                                                                                    |
| Refinements   | Full hit scan; filters can cost `O(H·(K+B))` with membership-list scans. Facets add `O(H·A)` work, optional sorting `O(H log H)`, selection/counts linear memory. No persistent facet index.                                                                               |
| Autocomplete  | After mutation, `O(V log V)` sorting and `O(V)` references; warm lookup is binary prefix search plus output/prefix comparisons.                                                                                                                                            |
| Explanations  | Retrieval plus a record per contributing term/field, with capture overhead.                                                                                                                                                                                                |
| Worker/HTTP   | Startup, clone/JSON, validation and transfer add costs. Moving work protects responsiveness; it does not guarantee higher throughput.                                                                                                                                      |

These estimates exclude nested caller-owned data, JS object overhead and runtime internals. Worst-case string hashing/comparisons depend on length. They describe this implementation, not optimal complexity.

## Angular and bundles

The catalog is lazy, OnPush and zoneless, renders 24 cards, tracks stable IDs and debounces by 120 ms. Input updates immediately; IME start cancels pending work; scoped controllers/debounce clean up on destruction. Index construction still runs on the main thread on entry. Consider an owned Worker for larger production data. Displayed durations do not measure Core Web Vitals.

`pnpm bundle` enforces the unchanged 5,000-byte gzip basic-core budget and reports raw/gzip/Brotli in artifacts. Optional highlighting is excluded from that consumer. Angular's build reports initial/lazy chunks; the website retains its own bundle metafile. Do not extrapolate the core-only bundle to an application.

## Reproduce

Run `pnpm build`, `pnpm benchmark`, `pnpm benchmark:workers` and `pnpm benchmark:catalog`. Preserve environment, revision, dirty state, warmups and samples. Existing p95 uses sorted sample `floor(0.95 * sampleCount)`. Worker heap is sampled without explicit GC and differs from retained index heap. Cross-machine timings and synthetic workloads are not production latency guarantees.
