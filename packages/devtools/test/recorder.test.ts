import { expect, test } from "vitest";
import { createSearchState } from "@searchivo/core/state";
import { recordSearch } from "../src/index.js";
test("records bounded detached summaries and supports clear/dispose", async () => {
  const controller = createSearchState<{ id: number }>(() => ({
    results: [],
    total: 0,
    facets: {},
  }));
  const recorder = recordSearch(controller, 2);
  await controller.search({ query: "a" });
  expect(recorder.entries()).toHaveLength(2);
  expect(recorder.entries()[0]?.loading).toBe(true);
  expect(recorder.entries()[1]?.query).toBe("a");
  expect(recorder.entries()).not.toBe(recorder.entries());
  recorder.clear();
  expect(recorder.entries()).toEqual([]);
  recorder.dispose();
  await controller.search({ query: "b" });
  expect(recorder.entries()).toEqual([]);
  const failure = createSearchState<{ id: number }>(() => {
    throw new Error("failed");
  });
  const defaultRecorder = recordSearch(failure);
  await failure.search({ query: "bad" });
  expect(defaultRecorder.entries().at(-1)?.failed).toBe(true);
  defaultRecorder.dispose();
  controller.dispose();
  failure.dispose();
  for (const limit of [0, 1.5, 10001])
    expect(() => recordSearch(controller, limit)).toThrow("limit");
});
