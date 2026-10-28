import { afterEach, expect, test, vi } from "vitest";
import { createCancellation } from "@searchivo/core/source";
import { createHttpSource, parseSearchResponse } from "../src/index.js";
type Doc = { id: number; name: string; stock: boolean };
const isDoc = (v: unknown): v is Doc =>
  typeof v === "object" &&
  v !== null &&
  "id" in v &&
  typeof v.id === "number" &&
  "name" in v &&
  typeof v.name === "string" &&
  "stock" in v &&
  typeof v.stock === "boolean";
const valid = {
  results: [
    { id: 1, score: 2, document: { id: 1, name: "Phone", stock: true } },
  ],
  total: 1,
  facets: { stock: [{ value: true, count: 1 }] },
  metadata: { source: "test" },
};
const options = {
  endpoint: "https://example.test/search",
  isDocument: isDoc,
  facetFields: ["stock"] as const,
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
test("validates documents, scores, IDs, metadata and facet allowlist", () => {
  expect(parseSearchResponse(valid, isDoc, ["stock"])).toEqual(valid);
  expect(
    parseSearchResponse({ results: [], total: 0, facets: {} }, isDoc),
  ).toEqual({ results: [], total: 0, facets: {} });
  for (const value of [
    null,
    [],
    {},
    { ...valid, results: {} },
    { ...valid, total: 0 },
    { ...valid, total: 1.5 },
    { ...valid, facets: null },
  ])
    expect(() => parseSearchResponse(value, isDoc)).toThrow("envelope");
  for (const hit of [
    null,
    { ...valid.results[0], id: "" },
    { ...valid.results[0], id: NaN },
    { ...valid.results[0], score: "1" },
    { ...valid.results[0], score: Infinity },
    { ...valid.results[0], score: -1 },
    { ...valid.results[0], document: {} },
  ])
    expect(() =>
      parseSearchResponse({ ...valid, results: [hit] }, isDoc),
    ).toThrow("result");
  expect(
    parseSearchResponse(
      { results: [{ ...valid.results[0], id: "x" }], total: 1, facets: {} },
      isDoc,
    ).results[0]?.id,
  ).toBe("x");
  expect(() =>
    parseSearchResponse(
      { ...valid, results: [...valid.results, ...valid.results], total: 2 },
      isDoc,
    ),
  ).toThrow("Duplicate");
  expect(() => parseSearchResponse(valid, isDoc)).toThrow("Unexpected facet");
  expect(() =>
    parseSearchResponse({ ...valid, facets: { stock: {} } }, isDoc, ["stock"]),
  ).toThrow("Unexpected");
  for (const bucket of [
    null,
    { value: {}, count: 1 },
    { value: NaN, count: 1 },
    { value: true, count: -1 },
    { value: true, count: 2 },
    { value: true, count: 1.5 },
  ])
    expect(() =>
      parseSearchResponse({ ...valid, facets: { stock: [bucket] } }, isDoc, [
        "stock",
      ]),
    ).toThrow("facet count");
  for (const value of ["a", 1, false])
    expect(
      parseSearchResponse(
        { ...valid, facets: { stock: [{ value, count: 1 }] } },
        isDoc,
        ["stock"],
      ).facets.stock?.[0]?.value,
    ).toBe(value);
  expect(() =>
    parseSearchResponse({ ...valid, facets: {}, metadata: [] }, isDoc),
  ).toThrow("metadata");
});
test("posts the full typed request and validates a successful response", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(valid));
  const source = createHttpSource({ ...options, fetch });
  const cancellation = createCancellation();
  const request = {
    query: "phone",
    offset: 0,
    limit: 10,
    filters: [{ field: "stock" as const, op: "eq" as const, value: true }],
  };
  expect(await source(request, cancellation.signal)).toEqual(valid);
  expect(fetch.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(request));
  expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
  cancellation.abort();
  expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
});
test("rejects HTTP, JSON and synchronous transport errors and validates config", async () => {
  for (const response of [
    new Response("", { status: 503 }),
    new Response("not json"),
    Response.json({}),
  ]) {
    const source = createHttpSource({
      ...options,
      fetch: vi.fn().mockResolvedValue(response),
    });
    await expect(
      source({ query: "a" }, createCancellation().signal),
    ).rejects.toThrow();
  }
  vi.stubGlobal("fetch", () => {
    throw new Error("offline");
  });
  await expect(
    createHttpSource(options)({ query: "" }, createCancellation().signal),
  ).rejects.toThrow("offline");
  await expect(
    createHttpSource({ endpoint: options.endpoint, isDocument: isDoc })(
      { query: "" },
      createCancellation().signal,
    ),
  ).rejects.toThrow("offline");
  for (const timeoutMs of [0, NaN, Infinity, 2147483648])
    expect(() => createHttpSource({ ...options, timeoutMs })).toThrow(
      "timeoutMs",
    );
  expect(() =>
    createHttpSource({ ...options, endpoint: "file:///tmp/data" }),
  ).toThrow("http or https");
  expect(() =>
    createHttpSource({ ...options, endpoint: "http://localhost" }),
  ).not.toThrow();
});
test("abort and timeout reject even when transport ignores cancellation and clean timers", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn<typeof globalThis.fetch>(() => new Promise(() => {}));
  const source = createHttpSource({ ...options, fetch, timeoutMs: 20 });
  const cancellation = createCancellation();
  cancellation.abort();
  await expect(source({ query: "a" }, cancellation.signal)).rejects.toThrow(
    "cancelled",
  );
  expect(fetch).not.toHaveBeenCalled();
  const live = createCancellation();
  const pending = source({ query: "a" }, live.signal);
  const failure = expect(pending).rejects.toThrow("cancelled");
  live.abort();
  await failure;
  expect(vi.getTimerCount()).toBe(0);
  const timed = source({ query: "a" }, createCancellation().signal);
  const timeoutFailure = expect(timed).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20);
  await timeoutFailure;
  expect(fetch.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
