import { expect, test, vi } from "vitest";
import { createSearchEngine } from "../src/index.js";
import { createCancellation, localSource } from "../src/source.js";
import type { SearchResponse } from "../src/source.js";
import { createDebouncer, createSearchState } from "../src/state.js";
import { createAutocomplete, groupedSuggestions } from "../src/suggestions.js";
type Doc = { id: number; text: string };
const response: SearchResponse<Doc> = { results: [], total: 0, facets: {} };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
test("local source and cancellation listeners are portable and one-shot", () => {
  const engine = createSearchEngine({ id: "id", fields: { text: {} } }, [
    { id: 1, text: "phone" },
  ]);
  const source = localSource(engine),
    cancellation = createCancellation();
  const listener = vi.fn(),
    removed = vi.fn();
  cancellation.signal.addEventListener("abort", listener);
  cancellation.signal.addEventListener("abort", removed);
  cancellation.signal.removeEventListener("abort", removed);
  expect(source({ query: "phone" }, cancellation.signal)).toMatchObject({
    total: 1,
  });
  cancellation.abort();
  cancellation.abort();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(removed).not.toHaveBeenCalled();
  expect(() => source({ query: "phone" }, cancellation.signal)).toThrow(
    "cancelled",
  );
});
test("state publishes loading, response, duration and lifecycle cleanup", async () => {
  let time = 0;
  const state = createSearchState<Doc>(
    () => response,
    () => ++time,
  );
  const listener = vi.fn();
  const unsubscribe = state.subscribe(listener);
  const pending = state.search({ query: "a" });
  expect(state.get().loading).toBe(true);
  await pending;
  expect(state.get()).toMatchObject({
    query: "a",
    loading: false,
    duration: 1,
    total: 0,
  });
  expect(listener).toHaveBeenCalledTimes(3);
  unsubscribe();
  await state.search({ query: "b" });
  expect(listener).toHaveBeenCalledTimes(3);
  state.cancel();
  state.dispose();
  state.dispose();
  expect(() => state.subscribe(listener)).toThrow("disposed");
  await expect(state.search({ query: "c" })).rejects.toThrow("disposed");
});
test("stale success and error never overwrite newer state even if abort is ignored", async () => {
  const a = deferred<SearchResponse<Doc>>(),
    b = deferred<SearchResponse<Doc>>(),
    c = deferred<SearchResponse<Doc>>();
  let calls = 0;
  const state = createSearchState<Doc>(
    () => [a.promise, b.promise, c.promise][calls++]!,
  );
  const first = state.search({ query: "a" }),
    second = state.search({ query: "b" });
  b.resolve({ ...response, total: 2 });
  await second;
  a.resolve({ ...response, total: 1 });
  await first;
  expect(state.get()).toMatchObject({ query: "b", total: 2 });
  const third = state.search({ query: "c" });
  state.cancel();
  c.reject(new Error("stale"));
  await third;
  expect(state.get().error).toBeUndefined();
  expect(state.get().loading).toBe(false);
});
test("current failures are exposed and disposal abandons pending completion", async () => {
  const error = new Error("transport");
  const state = createSearchState<Doc>(() => {
    throw error;
  });
  await state.search({ query: "bad" });
  expect(state.get().error).toBe(error);
  const deferredResponse = deferred<SearchResponse<Doc>>();
  const pending = createSearchState<Doc>(() => deferredResponse.promise);
  const search = pending.search({ query: "wait" });
  pending.dispose();
  deferredResponse.resolve(response);
  await search;
  expect(pending.get().loading).toBe(false);
});
test("debounce replaces pending calls and cleans up without platform globals", () => {
  const tasks: { callback: () => void; cancelled: boolean }[] = [];
  const run = vi.fn();
  const schedule = (callback: () => void, delay: number) => {
    expect(delay).toBe(20);
    const task = { callback, cancelled: false };
    tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  };
  const debounce = createDebouncer(run, schedule, 20);
  debounce.submit("a");
  debounce.submit("b");
  expect(tasks[0]!.cancelled).toBe(true);
  tasks[1]!.callback();
  expect(run).toHaveBeenCalledWith("b");
  debounce.dispose();
  debounce.dispose();
  expect(() => debounce.submit("c")).toThrow("disposed");
  const other = createDebouncer(run, schedule, 20);
  other.submit("d");
  other.dispose();
  expect(tasks[2]!.cancelled).toBe(true);
  for (const delay of [-1, NaN, Infinity])
    expect(() => createDebouncer(run, schedule, delay)).toThrow("delay");
});
test("prefix autocomplete uses lexical order and refreshes on mutations", () => {
  const engine = createSearchEngine({ id: "id", fields: { text: {} } }, [
    { id: 1, text: "banana apple application apex zed" },
  ]);
  const suggest = createAutocomplete(engine);
  expect(suggest("ap")).toEqual(["apex", "apple", "application"]);
  expect(suggest("ap", 1)).toEqual(["apex"]);
  expect(suggest("zz")).toEqual([]);
  expect(suggest("banana")).toEqual(["banana"]);
  expect(suggest("ap", 0)).toEqual([]);
  expect(suggest("")).toEqual([]);
  expect(suggest("two words")).toEqual([]);
  engine.clear();
  expect(suggest("a")).toEqual([]);
  engine.add([{ id: 2, text: "apricot" }]);
  expect(suggest("AP")).toEqual(["apricot"]);
  for (const limit of [-1, 1.5, 1001])
    expect(() => suggest("a", limit)).toThrow("limit");
});
test("async suggestions preserve groups and check cancellation before/after work", async () => {
  const cancellation = createCancellation();
  expect(
    await groupedSuggestions(
      [{ label: "Products", suggest: async (q) => [q] }],
      "phone",
      cancellation.signal,
    ),
  ).toEqual([{ label: "Products", suggestions: ["phone"] }]);
  const pending = deferred<readonly string[]>();
  const result = groupedSuggestions(
    [{ label: "Late", suggest: () => pending.promise }],
    "a",
    cancellation.signal,
  );
  cancellation.abort();
  pending.resolve(["a"]);
  await expect(result).rejects.toThrow("cancelled");
  await expect(groupedSuggestions([], "", cancellation.signal)).rejects.toThrow(
    "cancelled",
  );
  await expect(
    groupedSuggestions(
      [
        {
          label: "Fail",
          suggest: async () => {
            throw new Error("source");
          },
        },
      ],
      "",
      createCancellation().signal,
    ),
  ).rejects.toThrow("source");
});
