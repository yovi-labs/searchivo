import type { DocumentId, SearchResult } from "@searchivo/core";
/** Transport owns message/error subscriptions; termination is explicitly optional. */
export interface Transport {
  send(message: unknown): void;
  onMessage(listener: (message: unknown) => void): () => void;
  onError(listener: (error: Error) => void): () => void;
  terminate?(): void;
}
/** Typed operation payload/result map for protocol version 1. */
export interface Operations<T> {
  ready: { payload: null; result: true };
  add: { payload: readonly T[]; result: true };
  upsert: { payload: readonly T[]; result: true };
  remove: { payload: DocumentId; result: boolean };
  clear: { payload: null; result: true };
  search: { payload: string; result: readonly SearchResult<T>[] };
  suggest: {
    payload: { readonly query: string; readonly limit: number };
    result: readonly string[];
  };
  dispose: { payload: null; result: true };
}
/** Versioned worker request; each operation has its own payload shape. */
export type Request<T> = {
  [K in keyof Operations<T>]: {
    version: 1;
    id: number;
    operation: K;
    payload: Operations<T>[K]["payload"];
  };
}[keyof Operations<T>];
/** Runtime object guard used before inspecting unknown wire messages. */
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Accept only nonempty strings and finite numeric IDs. */
export function validId(value: unknown): value is DocumentId {
  return (
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}
/** Validate protocol envelopes and operation payloads before dispatch. */
export function validRequest<T>(
  value: unknown,
  isDocument: (value: unknown) => value is T,
): value is Request<T> {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.id) ||
    (value.id as number) <= 0
  )
    return false;
  switch (value.operation) {
    case "ready":
    case "clear":
    case "dispose":
      return value.payload === null;
    case "add":
    case "upsert":
      return Array.isArray(value.payload) && value.payload.every(isDocument);
    case "remove":
      return validId(value.payload);
    case "search":
      return typeof value.payload === "string";
    case "suggest":
      return (
        record(value.payload) &&
        typeof value.payload.query === "string" &&
        Number.isSafeInteger(value.payload.limit) &&
        (value.payload.limit as number) >= 0 &&
        (value.payload.limit as number) <= 1000
      );
    default:
      return false;
  }
}
/** Validate operation-specific unknown response payloads with a caller-supplied document guard. */
export function validResult<T, K extends keyof Operations<T>>(
  operation: K,
  value: unknown,
  isDocument: (value: unknown) => value is T,
): value is Operations<T>[K]["result"] {
  switch (operation) {
    case "remove":
      return typeof value === "boolean";
    case "search":
      return (
        Array.isArray(value) &&
        value.every(
          (hit) =>
            record(hit) &&
            validId(hit.id) &&
            typeof hit.score === "number" &&
            Number.isFinite(hit.score) &&
            hit.score >= 0 &&
            isDocument(hit.document),
        )
      );
    case "suggest":
      return (
        Array.isArray(value) && value.every((term) => typeof term === "string")
      );
    default:
      return value === true;
  }
}
