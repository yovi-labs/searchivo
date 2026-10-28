# Benchmark methodology

Run `pnpm build` then `pnpm benchmark` on an otherwise idle machine. This uses the built core entry point, seeded synthetic fixtures at 1k/10k/100k documents, repeated vocabulary and high-cardinality dictionaries. Raw samples, warmups, environment, source revision and dirty state are retained in each report. These fixtures are not production workload claims.

Retained heap is measured after explicit GC; the post-index sample is not a true peak-allocation measurement. Fixture allocation is outside both deltas. Results are descriptive until repeatability establishes a defensible regression baseline. No historical results are reused and no thresholds are silently reset. Reports added over time include BM25, refinements, fuzzy and suggestions only after their implementations exist; worker measurements remain pending.

The original deletion-key fuzzy index measured about 167 MB of retained heap and 618 ms cold build at 100k high-cardinality documents. The replacement trie measured about 29 MB and 27 ms on the same host/fixture. Both raw reports are preserved; these are individual samples, not a universal speedup claim. Warm traversal bounds do not bound cold construction. Small heap deltas may be negative due to GC noise and are not silently clamped.

`pnpm benchmark:workers` measures real Node worker startup, structured clone, indexing acknowledgment, query round trips, suggestion round trip and worker heap samples. Worker heap includes runtime overhead and is sampled without GC. Browser tests independently exercise a module Worker. These costs are not interchangeable with synchronous engine latency.
