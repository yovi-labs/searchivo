import { createWorkerClient } from "../packages/workers/dist/client.js";
import { webTransport } from "../packages/workers/dist/web.js";
type Doc = { id: number; text: string };
const isDocument = (value: unknown): value is Doc =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "number" &&
  "text" in value &&
  typeof value.text === "string";
export async function runWorkerExample() {
  const worker = new Worker("/search-worker.js", { type: "module" });
  const client = createWorkerClient(
    webTransport(worker, () => worker.terminate()),
    isDocument,
    true,
  );
  try {
    await client.request("ready", null);
    await client.request("add", [{ id: 1, text: "phone" }]);
    return {
      results: await client.request("search", "phone"),
      suggestions: await client.request("suggest", { query: "ph", limit: 5 }),
    };
  } finally {
    client.dispose();
  }
}
