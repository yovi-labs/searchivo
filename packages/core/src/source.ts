import { refine } from "./refinements.js";
import type { RefinedResults, Refinements } from "./refinements.js";
import type { SearchEngine } from "./types.js";
/** Portable subset structurally compatible with AbortSignal. */
export interface CancellationSignal {
  readonly aborted: boolean;
  addEventListener(type: "abort", listener: () => void): void;
  removeEventListener(type: "abort", listener: () => void): void;
}
/** Backend-independent query with typed refinements. */
export interface SearchRequest<T> extends Refinements<T> {
  readonly query: string;
}
/** Validated search response. Optional metadata remains opaque to the engine. */
export interface SearchResponse<T> extends RefinedResults<T> {
  readonly metadata?: Readonly<Record<string, unknown>>;
}
/** A source can be synchronous or asynchronous; it must honor cancellation where possible. */
export type SearchSource<T> = (
  request: SearchRequest<T>,
  signal: CancellationSignal,
) => SearchResponse<T> | Promise<SearchResponse<T>>;
/** Adapt a local synchronous engine to the portable source contract. */
export function localSource<T>(engine: SearchEngine<T>): SearchSource<T> {
  return (request, signal) => {
    if (signal.aborted) throw new Error("Search cancelled");
    return refine(engine.search(request.query), request);
  };
}
/** Create a portable one-shot cancellation controller. */
export function createCancellation(): {
  readonly signal: CancellationSignal;
  abort(): void;
} {
  let aborted = false;
  const listeners = new Set<() => void>();
  return {
    signal: {
      get aborted() {
        return aborted;
      },
      addEventListener(_type, listener) {
        listeners.add(listener);
      },
      removeEventListener(_type, listener) {
        listeners.delete(listener);
      },
    },
    abort() {
      if (aborted) return;
      aborted = true;
      for (const listener of listeners) listener();
      listeners.clear();
    },
  };
}
