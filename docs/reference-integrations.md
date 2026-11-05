# Workers, adapters and diagnostics API

All integrations are optional. Core remains framework-independent. [Generated declarations](https://searchivo.netlify.app/api/) list all types and signatures; [public inventory](public-api.md) maps the entry points. The [feature lab](https://searchivo.netlify.app/#features) exercises actual network and worker transport.

## Worker client and transport

Import `createWorkerClient`, `WorkerClient<T>`, `Operations<T>` and `Transport` from `@searchivo/workers/client`. `createWorkerClient(transport, isDocument, ownTransport = false)` returns a client. Its `request(operation, payload, signal?)` is a typed Promise; `dispose()` removes subscriptions, rejects pending requests and terminates only an owned transport that provides `terminate`.

`Transport` has `send(unknown): void`, `onMessage(listener): unsubscribe`, `onError(listener): unsubscribe`, and optional `terminate(): void`. Native errors reject all pending requests and close the client to new work. Disposing remains necessary to terminate an owned worker. Malformed envelopes reject pending requests; operation-specific invalid results reject their request. Responses for abandoned/unknown IDs are ignored. Protocol version is 1; IDs are positive safe integers. Transport payloads are data, never executable strategy functions.

| `Operations<T>` key | Payload                                                  | Result                       |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| `ready`             | `null`                                                   | `true`                       |
| `add`, `upsert`     | `readonly T[]`                                           | `true`                       |
| `remove`            | `DocumentId`                                             | `boolean`                    |
| `clear`             | `null`                                                   | `true`                       |
| `search`            | `string`                                                 | `readonly SearchResult<T>[]` |
| `suggest`           | `{ query: string, limit: number }`, limit integer 0–1000 | `readonly string[]`          |
| `dispose`           | `null`                                                   | `true`                       |

Cancellation abandons a reply; it does not stop synchronous worker computation or undo mutations. There is no automatic request timeout: add an application timer that aborts, including for `ready`, when a lost/unattached worker is possible. Do not assume protocol document validation enforces identity equality or every application business rule.

## Worker runtime and web adapter

Import `attachWorkerRuntime` from `@searchivo/workers/runtime`: `(transport, engine, isDocument) => detachFunction`. Construct the engine and ranking within the worker. The guard validates incoming documents; engine validation still enforces IDs and indexed strings. A `dispose` operation clears data and rejects future operations, but leaves the listener attached to report that failure. Calling the returned detach function removes the listener and clears the index. Neither action implicitly terminates a shared transport.

Import `webTransport` from `@searchivo/workers/web`: `(endpoint, terminate?) => Transport`. The endpoint structurally supplies `postMessage`, `addEventListener` and `removeEventListener`, such as a Worker, MessagePort or worker global. It listens for `error` and `messageerror`. Call `port.start()` yourself when required. Supply `() => worker.terminate()` and `ownTransport: true` only for exclusive ownership. The [worker recipe](recipes.md#move-indexing-into-a-worker) links complete browser modules validated by the deployed examples.

## HTTP adapter

Import `createHttpSource`, `parseSearchResponse` and `HttpSourceOptions<T>` from `@searchivo/adapters`.

| Option        | Contract                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `endpoint`    | Required absolute HTTP(S) URL; other protocols reject at construction.                               |
| `isDocument`  | Required `(unknown) => value is T`; validate all application-used fields.                            |
| `facetFields` | `[]`; allowlist of scalar field names expected in responses.                                         |
| `timeoutMs`   | `10000`; finite positive value no greater than 2147483647.                                           |
| `fetch`       | `globalThis.fetch`; injectable fetch-compatible implementation, useful for authentication and tests. |

`createHttpSource(options)` returns `SearchSource<T>`. It POSTs the full JSON request with content-type application/json and an AbortSignal. Non-OK HTTP status, invalid JSON, invalid response, cancellation or timeout rejects. Cancellation and timeout race transport independently, so rejection still occurs if fetch ignores abort. Timers/listeners are removed on completion; an ignoring transport can continue work independently.

`parseSearchResponse(value, isDocument, facetFields = [])` returns a validated `SearchResponse<T>` or throws. Results require nonempty string/finite numeric IDs, finite nonnegative scores, guard-accepted documents and unique IDs. `total` must be a safe integer at least the returned result count. Facets must be allowlisted arrays of scalar `value` and safe integer `count` between zero and total. Optional metadata must be a nonarray record and remains opaque. The adapter does not enforce response byte limits, hit/document counts, nested depth, ID/document identity agreement, uniqueness of facet buckets or application authorization; enforce these at the server or custom transport boundary.

See the [complete deterministic HTTP recipe](recipes.md#validate-an-http-backend). The live fixture is explicitly limited to four fictional products and 200 query code units, with a 10,000-byte body cap. It does not pretend to be an authenticated production search service.

## Explanations

Import `explainSearch` and `SearchExplanation<T>` from `@searchivo/core/explain`. `explainSearch(engine, query, { expandedTerms?, now? } = {})` returns normalizedQuery, unique tokens, copied expandedTerms, results, real `ScoreContribution[]`, and timings `{ normalizationMs, instrumentedSearchMs }`. Defaults are exact query terms and `Date.now`. Pass fuzzy response terms to explain expanded retrieval and `performance.now` for higher-resolution measurements. The callback captures actual score contributions, including field, term, frequency, boost and ID. It allocates records and includes instrumentation overhead; ordinary searches allocate no explanation records. See the [BM25 example](reference-core.md#bm25-and-custom-ranking).

## DevTools recorder

Import `recordSearch` and `SearchRecord` from `@searchivo/devtools`. `recordSearch(controller, limit = 50)` accepts a safe integer limit in `[1, 10000]`; invalid limits throw. It subscribes immediately and retains bounded transitions `{ query, loading, failed, total, duration }`, including the initial state. Returned `entries()` makes detached summary objects, `clear()` empties the log, and `dispose()` unsubscribes. It does not record documents or send remote telemetry. Query text can still be sensitive: keep diagnostics local and bounded. The [async recipe](recipes.md#debounce-and-observable-state) demonstrates the whole lifecycle.

## Optional themes

`@searchivo/themes/css` exports scoped CSS; import it in your application's stylesheet/build configuration and put `searchivo-theme` on a container. No JavaScript or components are included. `@searchivo/themes/scss` exports a Sass `tokens($accent: #ff65b3, $background: #0b1220)` mixin using Sass's `NodePackageImporter`. Override CSS custom properties for application styling. Focus-visible and reduced-motion styles exist, but the consumer still owns labels, focus, popup keyboard semantics and live regions. Native browser controls differ by platform. [Theme source](https://github.com/yovi-labs/searchivo/tree/develop/packages/themes).
