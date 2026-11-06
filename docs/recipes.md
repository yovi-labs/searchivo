# Recipes: asynchronous search and HTTP

Use a `SearchSource` to separate retrieval from user interaction. These examples are complete executable modules checked against packed packages. [State reference](reference-interaction.md) · [HTTP reference](reference-integrations.md) · [live feature lab](https://searchivo-market.netlify.app/#features).

## Debounce and observable state

Cancel pending debounce at IME start, and cancel active work on input if you want old loading states to stop immediately. The controller independently guards against stale responses. Always dispose both resources when the view is destroyed.

```ts
import { createSearchEngine } from "@searchivo/core";
import { localSource } from "@searchivo/core/source";
import { createSearchState, createDebouncer } from "@searchivo/core/state";
import { recordSearch } from "@searchivo/devtools";
const engine = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "Desk lamp" },
]);
const controller = createSearchState(localSource(engine), () =>
  performance.now(),
);
const recorder = recordSearch(controller, 20);
const stop = controller.subscribe((state) => {
  if (state.error) console.error("Search failed", state.error);
});
const debounce = createDebouncer<string>(
  (query) => {
    void controller.search({ query, limit: 10 });
  },
  (callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
  120,
);
debounce.submit("desk");
debounce.cancel();
await controller.search({ query: "lamp", limit: 10 });
if (controller.get().results[0]?.id !== 1) throw new Error("Expected lamp");
const transitions = recorder.entries();
controller.cancel();
stop();
recorder.clear();
recorder.dispose();
debounce.dispose();
controller.dispose();
export { transitions };
```

While loading, keep previous results visible and announce status with a live region. After a failure, show a meaningful error and allow another query. If an empty query should browse everything, implement that in the source; `localSource` intentionally follows empty-engine-query semantics. Use the feature lab's `slow`, Cancel and Test stale response controls to observe noncooperative transport behavior.

## Validate an HTTP backend

The following mocked fetch makes this example deterministic and executable without an external service. In the actual lab, the adapter POSTs to the deployed `/api/search` fixture, which searches four fictional products. It returns all matching hits and lets the lab refine locally; it is not a general backend implementing every request option. `/api/invalid` intentionally returns an invalid envelope to demonstrate validation errors.

```ts
import { createHttpSource, parseSearchResponse } from "@searchivo/adapters";
import { createCancellation } from "@searchivo/core/source";
type Product = { id: number; name: string };
const isProduct = (value: unknown): value is Product =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "number" &&
  Number.isFinite(value.id) &&
  "name" in value &&
  typeof value.name === "string";
const envelope = {
  results: [{ id: 1, document: { id: 1, name: "Desk lamp" }, score: 1 }],
  total: 1,
  facets: {},
};
const checked = parseSearchResponse(envelope, isProduct);
const source = createHttpSource({
  endpoint: "https://searchivo-market.netlify.app/api/search",
  isDocument: isProduct,
  timeoutMs: 5000,
  fetch: async () => Response.json(envelope),
});
const cancellation = createCancellation();
const response = await source(
  { query: "desk", limit: 10 },
  cancellation.signal,
);
cancellation.abort();
if (response.total !== checked.total) throw new Error("Invalid response");
export { response };
```

In your own backend implement filtering, authorization, paging and resource limits server-side. Supply a runtime guard checking every field you consume; a TypeScript assertion is not validation. Use `facetFields` to explicitly allow expected facet keys. Wrap `fetch` to add your application's authentication; never put a server credential into a browser bundle. Browser CORS policies still apply to cross-origin sources.

## Safe highlight rendering

Create nodes rather than injecting result text as HTML. The [catalog](https://github.com/yovi-labs/searchivo/blob/develop/apps/angular-example/src/catalog.ts) splits names into matched and unmatched slices and the Angular template interpolates each slice. For plain DOM, create a `DocumentFragment`, append `document.createTextNode` for ordinary text and a `mark` element with `textContent` for each highlighted range. Preserve unmatched text before/between/after ranges. The highlight helper's UTF-16 offsets already index the original text; do not index a normalized copy.

## Move indexing into a Worker

Use the complete [worker module](https://github.com/yovi-labs/searchivo/blob/develop/examples/browser-worker.ts) and [client](https://github.com/yovi-labs/searchivo/blob/develop/examples/browser-worker-client.ts). Construct ranking functions in the worker, attach the validated runtime, then await a `ready` request before indexing. Cache the client across searches; terminate only when owned and dispose on view teardown. The [worker reference](reference-integrations.md) lists the exact operation payloads. Check deployed worker URLs and MIME types; an HTML fallback at a JavaScript URL is a deployment error.
