import { createCancellation } from "./source.js";
import type { SearchRequest, SearchResponse, SearchSource } from "./source.js";
/** Observable search state; old results remain visible while a newer request loads. */
export interface SearchState<T> extends SearchResponse<T> {
  readonly query: string;
  readonly loading: boolean;
  readonly error: unknown;
  readonly duration: number;
}
/** Headless request controller. Subscribers must not throw. */
export interface SearchController<T> {
  get(): SearchState<T>;
  subscribe(listener: (state: SearchState<T>) => void): () => void;
  search(request: SearchRequest<T>): Promise<void>;
  cancel(): void;
  dispose(): void;
}
/** Create latest-request-wins orchestration independent of framework and debounce. */
export function createSearchState<T>(
  source: SearchSource<T>,
  now: () => number = Date.now,
): SearchController<T> {
  let state: SearchState<T> = {
    query: "",
    results: [],
    total: 0,
    facets: {} as SearchResponse<T>["facets"],
    loading: false,
    error: undefined,
    duration: 0,
  };
  let generation = 0,
    disposed = false;
  let active: ReturnType<typeof createCancellation> | undefined;
  const listeners = new Set<(state: SearchState<T>) => void>();
  function publish(next: SearchState<T>): void {
    state = Object.freeze(next);
    for (const listener of listeners) listener(state);
  }
  function cancel(): void {
    generation++;
    active?.abort();
    active = undefined;
    if (state.loading) publish({ ...state, loading: false });
  }
  return {
    get() {
      return state;
    },
    subscribe(listener) {
      if (disposed) throw new Error("Search state is disposed");
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    async search(request) {
      if (disposed) throw new Error("Search state is disposed");
      active?.abort();
      const current = ++generation;
      const controller = createCancellation();
      active = controller;
      const started = now();
      publish({
        ...state,
        query: request.query,
        loading: true,
        error: undefined,
      });
      try {
        const response = await source(request, controller.signal);
        if (current !== generation) return;
        publish({
          ...response,
          query: request.query,
          loading: false,
          error: undefined,
          duration: now() - started,
        });
      } catch (error: unknown) {
        if (current !== generation) return;
        publish({ ...state, loading: false, error, duration: now() - started });
      } finally {
        if (current === generation) active = undefined;
      }
    },
    cancel,
    dispose() {
      disposed = true;
      listeners.clear();
      cancel();
    },
  };
}
/** Platform scheduler returns a function that cancels its scheduled callback. */
export type Scheduler = (callback: () => void, delay: number) => () => void;
/** Debounce independently of the engine/controller; cancel pending work on disposal. */
export function createDebouncer<T>(
  run: (value: T) => void,
  schedule: Scheduler,
  delay: number,
): { submit(value: T): void; dispose(): void } {
  if (!Number.isFinite(delay) || delay < 0)
    throw new Error("debounce delay must be finite and nonnegative");
  let cancel: (() => void) | undefined;
  let disposed = false;
  return {
    submit(value) {
      if (disposed) throw new Error("Debouncer is disposed");
      cancel?.();
      cancel = schedule(() => {
        cancel = undefined;
        run(value);
      }, delay);
    },
    dispose() {
      disposed = true;
      cancel?.();
      cancel = undefined;
    },
  };
}
