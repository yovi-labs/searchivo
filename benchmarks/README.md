# Benchmark methodology

Run `pnpm build` then `pnpm benchmark` on an otherwise idle machine. This uses the built core entry point, seeded synthetic fixtures at 1k/10k/100k documents, repeated vocabulary and high-cardinality dictionaries. Raw samples, warmups, environment, source revision and dirty state are retained in each report. These fixtures are not production workload claims.

Retained heap is measured after explicit GC; the post-index sample is not a true peak-allocation measurement. Fixture allocation is outside both deltas. Results are descriptive until repeatability establishes a defensible regression baseline. No historical results are reused and no thresholds are silently reset. Fuzzy/suggestion/worker measurements await those implementations.
