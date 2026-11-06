# @searchivo/devtools

`recordSearch(controller, limit = 50)` subscribes to a portable controller and keeps bounded local state-transition summaries. Call `entries()` for a detached array, `clear()` to reset it, and `dispose()` to unsubscribe. Queries, loading, failure flags, counts and durations are retained; document payloads are not. No network or remote telemetry is built in.

For score details, import `explainSearch` from `@searchivo/core/explain`. It records actual term/field contributions, boosts and total results using an explicitly supplied scoring observer. Normal search creates no explanation records. Optional expandedTerms can come from fuzzy search. Timings measure normalization and instrumented search, including capture overhead; they are not uninstrumented query benchmarks.

## Installation and reference

Install in your application:

```sh
npm install @searchivo/devtools@0.1.0 @searchivo/core@0.1.0
```

See [installation and release availability](https://searchivo.netlify.app/docs/tutorial/).

[Full API reference and examples](https://searchivo.netlify.app/docs/reference-integrations/) · [Official website](https://searchivo.netlify.app/) · [Working Angular application](https://searchivo-market.netlify.app/)
