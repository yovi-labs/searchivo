import type { SearchEngine } from "@searchivo/core";
import { createAutocomplete } from "@searchivo/core/suggestions";
import { record, validRequest } from "./protocol.js";
import type { Transport } from "./protocol.js";
/** Attach an engine constructed in the worker. Never sends or evaluates strategy functions. */
export function attachWorkerRuntime<T>(
  transport: Transport,
  engine: SearchEngine<T>,
  isDocument: (value: unknown) => value is T,
): () => void {
  const suggest = createAutocomplete(engine);
  let disposed = false;
  const off = transport.onMessage((message) => {
    const id =
      record(message) &&
      Number.isSafeInteger(message.id) &&
      (message.id as number) > 0
        ? message.id
        : 0;
    try {
      if (!validRequest(message, isDocument))
        throw new Error("Invalid worker request");
      if (disposed) throw new Error("Worker runtime disposed");
      let value: unknown = true;
      switch (message.operation) {
        case "ready":
          break;
        case "add":
          engine.add(message.payload);
          break;
        case "upsert":
          engine.upsert(message.payload);
          break;
        case "remove":
          value = engine.remove(message.payload);
          break;
        case "clear":
          engine.clear();
          break;
        case "search":
          value = engine.search(message.payload);
          break;
        case "suggest":
          value = suggest(message.payload.query, message.payload.limit);
          break;
        case "dispose":
          engine.clear();
          disposed = true;
          break;
      }
      transport.send({ version: 1, id, ok: true, value });
    } catch (error: unknown) {
      transport.send({
        version: 1,
        id,
        ok: false,
        error:
          error instanceof Error ? error.message : "Worker operation failed",
      });
    }
  });
  return () => {
    disposed = true;
    off();
    engine.clear();
  };
}
