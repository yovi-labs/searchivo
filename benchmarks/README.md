# Benchmark methodology

Run `pnpm build` then `pnpm benchmark` on an otherwise idle machine. This uses the built core entry point, seeded synthetic fixtures at 1k/10k/100k documents, repeated vocabulary and high-cardinality dictionaries. Raw samples, warmups, environment, source revision and dirty state are retained in each report. These fixtures are not production workload claims.

Retained heap is measured after explicit GC; the post-index sample is not a true peak-allocation measurement. Fixture allocation is outside both deltas. Results are descriptive until repeatability establishes a defensible regression baseline. No historical results are reused and no thresholds are silently reset. Reports added over time include BM25, refinements, fuzzy and suggestions only after their implementations exist; worker measurements remain pending.

The initial deletion-key fuzzy index costs about 167 MB of retained heap and 618 ms cold build at 100k high-cardinality documents on the recorded Windows host. This is a material limitation, preserved for performance hardening; warm candidate bounds do not bound cold construction. Use the raw report, not these rounded figures, for comparisons.
