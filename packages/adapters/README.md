# @searchivo/adapters

`createHttpSource({ endpoint, isDocument, facetFields, timeoutMs })` implements the portable SearchSource contract. Connect it to `createSearchState` or Angular's `createSearchivo`. The endpoint receives a POST JSON SearchRequest, including query, filters, facets, sorting and pagination.

Return `{ results: [{ id, document, score }], total, facets, metadata? }`. Each document must pass your runtime guard. IDs must be nonempty strings or finite numbers; scores must be finite/nonnegative; totals/counts must be nonnegative safe integers. Duplicate IDs, unknown facet fields and malformed metadata fail explicitly. `parseSearchResponse` is exported for custom transports.

Timeout defaults to 10 seconds. Both cancellation and timeout reject even if an injected fetch ignores AbortSignal. Timers and abort listeners are cleaned up. Wrap fetch to supply application authentication; no credentials are collected or attached implicitly. Use the generation-safe state controller to prevent stale responses from overwriting new results.

The packed-package validation starts a real local HTTP server and exercises this source. Unit tests cover malformed data, HTTP/JSON failures and noncooperative cancellation. This is an adapter; no production search server is included.
