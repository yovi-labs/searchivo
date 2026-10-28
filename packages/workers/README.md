# @searchivo/workers

Private optional worker execution. Import `createWorkerClient` from `/client`, `attachWorkerRuntime` from `/runtime`, and `webTransport` from `/web`. Construct the engine and any custom scoring functions inside the worker. Supply the same document validator at each boundary.

The [browser example](../../examples/browser-worker.ts) attaches the runtime; its [client](../../examples/browser-worker-client.ts) acknowledges readiness before indexing and querying. Supported operations are ready, add, upsert, remove, clear, search, suggest and dispose. Messages use protocol version 1 and positive request IDs.

Client request cancellation abandons the response. It cannot interrupt synchronous CPU work or roll back index changes. Pass ownTransport=true only if the client owns termination. Always dispose the client; detach the runtime if a shared endpoint outlives it. A runtime dispose request clears the index and rejects further operations but does not terminate a shared port. Native worker errors reject pending work; malformed messages are explicit errors.

`pnpm benchmark:workers` records real Node worker startup, clone samples, indexing acknowledgments, query round trips, suggestions and worker heap samples. Browser tests exercise the module Worker path. Node worker heap is sampled without GC and is not peak or retained memory.
