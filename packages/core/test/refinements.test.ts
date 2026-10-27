import { expect, test } from "vitest";
import { createSearchEngine } from "../src/index.js";
import { refine } from "../src/refinements.js";
const hits = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "phone", price: 10, stock: true, brand: "a" },
  { id: 2, name: "phone", price: 20, stock: false, brand: "b" },
  { id: 3, name: "phone", price: 10, stock: true, brand: "a" },
]).search("phone");
test("typed filters combine with conjunctive facets and pre-page totals", () => {
  const result = refine(hits, {
    filters: [
      { field: "stock", op: "eq", value: true },
      { field: "brand", op: "in", values: ["a"] },
      { field: "price", op: "range", min: 10, max: 10 },
    ],
    facets: ["brand", "stock"],
    offset: 1,
    limit: 1,
  });
  expect(result.results.map((x) => x.id)).toEqual([3]);
  expect(result.total).toBe(2);
  expect(result.facets).toEqual({
    brand: [{ value: "a", count: 2 }],
    stock: [{ value: true, count: 2 }],
  });
  expect(
    refine(hits, {
      filters: [{ field: "price", op: "range", min: 11 }],
    }).results.map((x) => x.id),
  ).toEqual([2]);
  expect(
    refine(hits, { filters: [{ field: "price", op: "range", max: 9 }] }).total,
  ).toBe(0);
  expect(
    refine(hits, { filters: [{ field: "price", op: "range" }] }).total,
  ).toBe(3);
});
test("stable ascending/descending sort preserves ties and input", () => {
  expect(
    refine(hits, { sort: { field: "price", direction: "desc" } }).results.map(
      (x) => x.id,
    ),
  ).toEqual([2, 1, 3]);
  expect(
    refine(hits, { sort: { field: "price", direction: "asc" } }).results.map(
      (x) => x.id,
    ),
  ).toEqual([1, 3, 2]);
  expect(hits.map((x) => x.id)).toEqual([1, 2, 3]);
  expect(refine(hits).total).toBe(3);
  expect(refine(hits, { offset: 99 }).results).toEqual([]);
  expect(refine(hits, { limit: 0 }).results).toEqual([]);
  expect(refine([], { facets: ["id"] }).facets).toEqual({ id: [] });
});
test("validates pagination and numeric range bounds", () => {
  for (const offset of [-1, 1.5, Infinity, NaN])
    expect(() => refine(hits, { offset })).toThrow("offset");
  expect(() => refine(hits, { limit: -1 })).toThrow("limit");
  for (const range of [{ min: NaN }, { max: Infinity }, { min: 20, max: 10 }])
    expect(() =>
      refine(hits, { filters: [{ field: "price", op: "range", ...range }] }),
    ).toThrow("bounds");
  const malformed = [
    {
      ...hits[0]!,
      document: { ...hits[0]!.document, price: "invalid" as unknown as number },
    },
  ];
  expect(
    refine(malformed, { filters: [{ field: "price", op: "range", min: 0 }] })
      .total,
  ).toBe(0);
});
