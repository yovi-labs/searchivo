import { createSearchEngine } from "../packages/core/dist/index.js";
import { attachWorkerRuntime } from "../packages/workers/dist/runtime.js";
import { webTransport } from "../packages/workers/dist/web.js";
type Doc = { id: number; text: string };
const isDocument = (value: unknown): value is Doc =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "number" &&
  "text" in value &&
  typeof value.text === "string";
attachWorkerRuntime(
  webTransport(self),
  createSearchEngine<Doc>({ id: "id", fields: { text: {} } }),
  isDocument,
);
