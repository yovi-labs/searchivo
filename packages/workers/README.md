# @searchivo/workers

Optional worker execution. Import `createWorkerClient` from `/client`, `attachWorkerRuntime` from `/runtime`, and `webTransport` from `/web`. Construct the engine and any custom scoring functions inside the worker. Supply the same document validator at each boundary.

The [browser example](https://github.com/yovi-labs/searchivo/blob/develop/examples/browser-worker.ts) attaches the runtime; its [client](https://github.com/yovi-labs/searchivo/blob/develop/examples/browser-worker-client.ts) acknowledges readiness before indexing and querying. Supported operations are ready, add, upsert, remove, clear, search, suggest and dispose. Messages use protocol version 1 and positive request IDs.

Client request cancellation abandons the response. It cannot interrupt synchronous CPU work or roll back index changes. Pass ownTransport=true only if the client owns termination. Always dispose the client; detach the runtime if a shared endpoint outlives it. A runtime dispose request clears the index and rejects further operations but does not terminate a shared port. Native worker errors reject pending work; malformed messages are explicit errors.

Measure worker startup, document transfer and query round trips with your own dataset. Moving work off the main thread can protect UI responsiveness; it does not guarantee faster queries. [Performance guidance](https://searchivo.netlify.app/docs/performance/).

## Installation and reference

Install in your application:

```sh
npm install @searchivo/workers@0.1.0 @searchivo/core@0.1.0
```

See [installation and release availability](https://searchivo.netlify.app/docs/tutorial/).

[Full API reference and examples](https://searchivo.netlify.app/docs/reference-integrations/) · [Official website](https://searchivo.netlify.app/) · [Working Angular application](https://searchivo-market.netlify.app/)
