# R-ADR-006: Optional portable sources, suggestions and orchestration

The engine remains synchronous. Source requests reuse typed refinements; responses contain ranked results, totals, facets and optional opaque metadata. A portable cancellation interface is structurally compatible with AbortSignal. Local sources cannot preempt synchronous indexing/query work.

State combines cancellation with monotonically increasing request generations so ignored cancellation cannot overwrite later results or errors. Previous results stay visible while loading. Cancellation clears loading; disposal cancels and drops listeners. Subscribers must not throw or mutate snapshots. A separately injected scheduler owns debounce timers; platform integrations supply setTimeout/clearTimeout without leaking DOM/Node types into core.

Autocomplete uses a lazy sorted dictionary, binary lower-bound search and bounded prefix enumeration. Empty/multi-token queries produce no suggestions. Async named suggestion groups preserve source order and reject as a unit if any source fails; cancellation is checked before/after awaiting sources. This is not partial-success aggregation or implicit ranking of remote suggestions.
