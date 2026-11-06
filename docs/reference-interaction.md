# Refinements, suggestions and state API

These optional core entry points compose with the engine. [Live catalog](https://searchivo-market.netlify.app/) · [feature lab](https://searchivo-market.netlify.app/#features) · [source](https://github.com/yovi-labs/searchivo/tree/develop/packages/core/src) · [generated declarations](https://searchivo.netlify.app/api/).

## Filters, facets, sorting and pagination

Import `refine`, `Scalar`, `Filter<T>`, `Refinements<T>`, `FacetCount` and `RefinedResults<T>` from `@searchivo/core/refinements`.

`refine(hits, options = {})` returns `{ results, total, facets }` without mutating its input. `Scalar` is string, number or boolean. Only scalar-valued fields can be filtered, sorted or faceted. The discriminated `Filter<T>` type ties a field to its values:

| Option    | Default and behavior                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filters` | `[]`; AND of `{ field, op: "eq", value }`, `{ field, op: "in", values }`, or numeric `{ field, op: "range", min?, max? }`. Ranges are inclusive; omitted bounds are open.    |
| `facets`  | `[]`; field keys. Each maps to `FacetCount[]` of `{ value, count }` over filtered hits **before** paging. Bucket order follows first occurrence; no disjunctive facet index. |
| `sort`    | Omitted preserves relevance. `{ field, direction: "asc" \| "desc" }`; stable, retaining relevance for equal values. Strings use JS lexical ordering, not locale collation.   |
| `offset`  | `0`; nonnegative safe integer; out-of-range offsets return an empty page with unchanged total/facets.                                                                        |
| `limit`   | `20`; nonnegative safe integer; `0` still calculates total and facets.                                                                                                       |

Nonfinite/reversed range bounds and invalid pagination throw. Equality is strict; membership uses `includes`. Runtime field types are trusted local data, so validate remote data first. Filtering follows retrieval/ranking and cannot save that earlier work. Empty engine queries are not match-all queries.

```ts
import { createSearchEngine } from "@searchivo/core";
import { refine } from "@searchivo/core/refinements";
const engine = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "Desk lamp", price: 49, category: "Home", inStock: true },
  { id: 2, name: "Desk chair", price: 129, category: "Office", inStock: false },
]);
const page = refine(engine.search("desk"), {
  filters: [
    { field: "price", op: "range", max: 100 },
    { field: "inStock", op: "eq", value: true },
  ],
  facets: ["category"],
  sort: { field: "price", direction: "asc" },
  offset: 0,
  limit: 24,
});
if (page.total !== 1 || page.results[0]?.id !== 1)
  throw new Error("Unexpected refinement");
export { page };
```

## Autocomplete and groups

Import `createAutocomplete`, `groupedSuggestions`, `SuggestionGroup` and `SuggestionSource` from `@searchivo/core/suggestions`.

`createAutocomplete(engine)` returns `(query, limit = 10) => readonly string[]`. Keep the closure to reuse its sorted dictionary; mutation revisions invalidate it. `limit` must be a safe integer in `[0, 1000]`. Empty or multiple-token queries return `[]`; a single normalized token selects lexical dictionary prefixes. Suggestions are terms, not product titles, ranked popularity, or a full search response. Invalid limits throw even for empty queries.

`groupedSuggestions(sources, query, signal)` returns `Promise<readonly SuggestionGroup[]>`, preserving configured group order. A `SuggestionSource` has `label` and async `suggest(query, signal)`. A `SuggestionGroup` has `label` and readonly string `suggestions`. Sources resolve concurrently; any source rejection rejects the entire call. Cancellation is checked before and after resolution; a source ignoring cancellation can delay rejection. Cancel old groups and handle rejection when new input arrives. Consumers own keyboard popup semantics; the [playground](https://searchivo.netlify.app/playground/) demonstrates ArrowDown, Enter and Escape.

```ts
import { createSearchEngine } from "@searchivo/core";
import {
  createAutocomplete,
  groupedSuggestions,
} from "@searchivo/core/suggestions";
import { createCancellation } from "@searchivo/core/source";
const engine = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "Desk lamp" },
]);
const suggest = createAutocomplete(engine);
const cancellation = createCancellation();
const groups = await groupedSuggestions(
  [
    { label: "Dictionary", suggest: async (query) => suggest(query, 6) },
    {
      label: "Quick queries",
      suggest: async (query) =>
        ["desk"].filter((term) => term.startsWith(query)),
    },
  ],
  "de",
  cancellation.signal,
);
cancellation.abort();
export { groups };
```

## Source and cancellation contracts

Import `SearchRequest<T>`, `SearchResponse<T>`, `SearchSource<T>`, `CancellationSignal`, `localSource` and `createCancellation` from `@searchivo/core/source`.

`SearchRequest<T>` extends `Refinements<T>` with required `query: string`. `SearchResponse<T>` extends `RefinedResults<T>` with optional opaque readonly record `metadata`. `SearchSource<T>` is `(request, signal) => response | Promise<response>`. `localSource(engine)` runs engine retrieval then `refine`, rejecting if already cancelled. It cannot interrupt synchronous CPU work.

`createCancellation()` returns `{ signal, abort() }`. Its portable signal structurally supports `aborted`, `addEventListener("abort", listener)` and `removeEventListener("abort", listener)`. `abort()` is idempotent; use a **new** controller for another request. This subset can accept a native AbortSignal; it does not expose `reason`, `throwIfAborted` or arbitrary event types. Listeners added after abort are not invoked automatically; check `aborted` first.

## Search state

Import `createSearchState`, `SearchState<T>` and `SearchController<T>` from `@searchivo/core/state`. `createSearchState(source, now = Date.now)` returns a controller. `SearchState` contains response fields plus `query`, `loading`, `error: unknown` and `duration` in milliseconds. Initial state has empty query/results/facets, total/duration zero, loading false, and error undefined.

| Controller method     | Behavior                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get()`               | Returns current state; treat all nested arrays/documents as readonly. Published state is shallow frozen.                                                                                                                                       |
| `subscribe(listener)` | Immediately calls listener and returns an unsubscribe function. Subscribers must not throw or mutate state.                                                                                                                                    |
| `search(request)`     | `Promise<void>`; aborts prior request, publishes loading, then publishes results or captures error. Previous results stay visible while loading or after failure. Newest generation alone can publish, including when transport ignores abort. |
| `cancel()`            | Aborts current request, invalidates its generation, clears loading; retains results/query/error.                                                                                                                                               |
| `dispose()`           | Unsubscribes everyone and cancels; later search/subscribe rejects.                                                                                                                                                                             |

`search()` captures source errors in state; inspect `state.error`, not just rejected promises. A call after disposal rejects. Changing input is separate from searching; apply minimum-length and debounce policies in the application. Use `performance.now` as the optional clock for sub-millisecond diagnostics. Stale-response generation checks do not cancel server work or CPU computations.

## Debounce

`createDebouncer<T>(run, schedule, delay)` is exported from `@searchivo/core/state`, along with `Scheduler`. `delay` must be finite/nonnegative. A `Scheduler` is `(callback, delay) => cancelFunction`. There is no hidden timer dependency in core. Returned `submit(value)` cancels the pending callback and schedules the latest value; `cancel()` drops pending work and allows reuse; `dispose()` closes permanently and later submissions throw. Exceptions from `run` belong to the scheduler/caller; this helper does not catch them. See the [complete async recipe](recipes.md).
