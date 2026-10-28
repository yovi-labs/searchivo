# R-ADR-010: Explicit instrumentation and local recorder

An optional scoring observer receives term/field contributions from the actual ranking path. Normal engine.search(query) creates no contribution objects. The observer adds a conditional check to matched-field scoring; optional explanation aggregation and recorder modules are absent from basic bundles.

core/explain normalizes the query, records distinct tokens and optional expanded terms, and executes the engine with the observer. Timings report normalization and instrumented search only, including capture overhead. They do not pretend to split retrieval/ranking/sorting into independently measured stages. Supply performance.now through the now option for a high-resolution platform clock.

The devtools package subscribes to controller transitions and stores bounded local query/loading/error-flag/count/duration summaries. It does not include document payloads or send telemetry. Dispose removes its subscription. Explanation score sums are tested against actual default and BM25 results.
