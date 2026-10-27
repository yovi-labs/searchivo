import { expect, test } from "vitest";
import { bm25 } from "../src/bm25.js";
import { createSearchEngine } from "../src/index.js";

test("BM25 matches an independently calculated two-document corpus", () => {
  const engine = createSearchEngine(
    { id: "id", fields: { text: { boost: 2 } }, ranking: bm25() },
    [
      { id: 1, text: "apple apple pear" },
      { id: 2, text: "pear" },
    ],
  );
  // N=2, df(apple)=1, tf=2, dl=3, avgdl=2, boost=2.
  const expected = (2 * Math.log(2) * 4.4) / (2 + 1.2 * 1.375);
  expect(engine.search("apple")[0]?.score).toBeCloseTo(expected, 12);
  expect(engine.search("pear").map((x) => x.id)).toEqual([2, 1]);
});
test("custom k1/b including endpoints and invalid options", () => {
  const context = {
    frequency: 1,
    documentFrequency: 1,
    documentCount: 1,
    fieldLength: 2,
    averageFieldLength: 2,
    boost: 1,
  };
  expect(bm25({ k1: 2, b: 0 })(context)).toBeCloseTo(Math.log(4 / 3));
  expect(bm25({ b: 1 })(context)).toBeCloseTo(Math.log(4 / 3));
  for (const k1 of [0, -1, NaN, Infinity])
    expect(() => bm25({ k1 })).toThrow("k1");
  for (const b of [-1, 2, NaN, Infinity])
    expect(() => bm25({ b })).toThrow(" b ");
});
test("lengths and document frequencies remain accurate after all mutations", () => {
  const config = {
    id: "id",
    fields: { text: {}, empty: {} },
    ranking: bm25(),
  } as const;
  const a = { id: 1, text: "apple apple pear", empty: "" };
  const b = { id: 2, text: "apple", empty: "" };
  const engine = createSearchEngine(config, [a, b]);
  engine.upsert([{ ...a, text: "pear" }]);
  engine.remove(2);
  expect(engine.search("pear")).toEqual(
    createSearchEngine(config, [{ ...a, text: "pear" }]).search("pear"),
  );
  engine.clear();
  engine.add([b]);
  expect(engine.search("apple")).toEqual(
    createSearchEngine(config, [b]).search("apple"),
  );
});
test("custom scoring receives statistics and rejects invalid/overflowing scores", () => {
  const doc = { id: 1, text: "apple pear" };
  const engine = createSearchEngine(
    { id: "id", fields: { text: {} }, ranking: (c) => c.frequency + c.boost },
    [doc],
  );
  expect(engine.search("apple")[0]?.score).toBe(2);
  for (const score of [NaN, Infinity, -1]) {
    const bad = createSearchEngine(
      { id: "id", fields: { text: {} }, ranking: () => score },
      [doc],
    );
    expect(() => bad.search("apple")).toThrow("finite nonnegative");
  }
  const overflow = createSearchEngine(
    { id: "id", fields: { text: {} }, ranking: () => Number.MAX_VALUE },
    [doc],
  );
  expect(() => overflow.search("apple pear")).toThrow("overflowed");
  const zero = createSearchEngine(
    { id: "id", fields: { text: {} }, ranking: () => 0 },
    [doc],
  );
  expect(zero.search("apple")[0]?.score).toBe(0);
});
