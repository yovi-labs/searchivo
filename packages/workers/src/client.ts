import type { CancellationSignal } from "@searchivo/core/source";
import { record, validResult } from "./protocol.js";
import type { Operations, Transport } from "./protocol.js";
export type { Operations, Transport } from "./protocol.js";
/** Client requests are typed by operation; cancellation abandons replies, not CPU work. */
export interface WorkerClient<T> {
  request<K extends keyof Operations<T>>(
    operation: K,
    payload: Operations<T>[K]["payload"],
    signal?: CancellationSignal,
  ): Promise<Operations<T>[K]["result"]>;
  dispose(): void;
}
/** Connect to an existing worker. Terminate only when ownTransport=true. */
export function createWorkerClient<T>(
  transport: Transport,
  isDocument: (value: unknown) => value is T,
  ownTransport = false,
): WorkerClient<T> {
  let sequence = 0,
    disposed = false,
    closed = false;
  const pending = new Map<
    number,
    {
      accept(message: Record<string, unknown>): void;
      reject(error: Error): void;
      cleanup(): void;
    }
  >();
  function fail(error: Error): void {
    for (const task of pending.values()) {
      task.cleanup();
      task.reject(error);
    }
    pending.clear();
  }
  const offMessage = transport.onMessage((value) => {
    if (
      !record(value) ||
      value.version !== 1 ||
      !Number.isSafeInteger(value.id) ||
      (value.id as number) <= 0 ||
      typeof value.ok !== "boolean"
    ) {
      fail(new Error("Malformed worker response"));
      return;
    }
    const task = pending.get(value.id as number);
    if (!task) return;
    pending.delete(value.id as number);
    task.cleanup();
    task.accept(value);
  });
  const offError = transport.onError((error) => {
    disposed = true;
    fail(error);
    offMessage();
    offError();
  });
  return {
    request(operation, payload, signal) {
      if (disposed)
        return Promise.reject(new Error("Worker client is disposed"));
      if (signal?.aborted)
        return Promise.reject(new Error("Worker request cancelled"));
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const abort = () => {
          pending.delete(id);
          cleanup();
          reject(new Error("Worker request cancelled"));
        };
        const cleanup = () => signal?.removeEventListener("abort", abort);
        pending.set(id, {
          cleanup,
          reject,
          accept(message) {
            if (!message.ok) {
              reject(
                new Error(
                  typeof message.error === "string"
                    ? message.error
                    : "Malformed worker error",
                ),
              );
              return;
            }
            if (!validResult(operation, message.value, isDocument)) {
              reject(new Error("Invalid worker result"));
              return;
            }
            resolve(message.value);
          },
        });
        signal?.addEventListener("abort", abort);
        try {
          transport.send({ version: 1, id, operation, payload });
        } catch (error: unknown) {
          pending.delete(id);
          cleanup();
          reject(error);
        }
      });
    },
    dispose() {
      if (closed) return;
      closed = true;
      disposed = true;
      offMessage();
      offError();
      fail(new Error("Worker client disposed"));
      if (ownTransport) transport.terminate?.();
    },
  };
}
