import { parentPort } from "node:worker_threads";
import { createSearchEngine } from "../packages/core/dist/index.js";
import { attachWorkerRuntime } from "../packages/workers/dist/runtime.js";
const isDocument = (value) =>
  typeof value === "object" &&
  value !== null &&
  typeof value.id === "number" &&
  typeof value.text === "string";
const transport = {
  send: (value) => parentPort.postMessage(value),
  onMessage(listener) {
    const handler = (value) => {
      if (value === "heap")
        parentPort.postMessage({ heap: process.memoryUsage().heapUsed });
      else listener(value);
    };
    parentPort.on("message", handler);
    return () => parentPort.off("message", handler);
  },
  onError(listener) {
    parentPort.on("messageerror", listener);
    return () => parentPort.off("messageerror", listener);
  },
};
attachWorkerRuntime(
  transport,
  createSearchEngine({ id: "id", fields: { text: {} } }),
  isDocument,
);
