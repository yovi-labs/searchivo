import type { Transport } from "./protocol.js";
/** Adapt a Worker, MessagePort or worker global scope. Caller starts ports if required. */
export function webTransport(
  endpoint: Pick<
    MessagePort,
    "postMessage" | "addEventListener" | "removeEventListener"
  >,
  terminate?: () => void,
): Transport {
  return {
    send(message) {
      endpoint.postMessage(message);
    },
    onMessage(listener) {
      const handler = (event: MessageEvent<unknown>) => listener(event.data);
      endpoint.addEventListener("message", handler);
      return () => endpoint.removeEventListener("message", handler);
    },
    onError(listener) {
      const handler = () => listener(new Error("Worker transport failed"));
      endpoint.addEventListener("error", handler);
      endpoint.addEventListener("messageerror", handler);
      return () => {
        endpoint.removeEventListener("error", handler);
        endpoint.removeEventListener("messageerror", handler);
      };
    },
    ...(terminate ? { terminate } : {}),
  };
}
