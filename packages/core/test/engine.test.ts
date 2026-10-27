import { describe, expect, test } from "vitest";
import { createSearchEngine } from "../src/index.js";
type Product = { id: number | string; name: string; description: string };
const config = {
  id: "id",
  fields: { name: { boost: 3 }, description: {} },
} as const;
const product = (
  id: number | string,
  name = "apple",
  description = "",
): Product => ({ id, name, description });

describe("indexed exact search", () => {
  test("ranks by field boosts and term frequencies with stable insertion ties", () => {
    const engine = createSearchEngine<Product>(config);
    engine.add([
      product(2, "apple"),
      product(1, "Apple"),
      product(3, "", "apple apple"),
      product(4, "pear"),
    ]);
    expect(
      engine.search("APPLE apple").map(({ id, score }) => [id, score]),
    ).toEqual([
      [2, 3],
      [1, 3],
      [3, 2],
    ]);
    expect(engine.search("apple pear").map((x) => x.id)).toEqual([2, 1, 4, 3]);
    expect(engine.search("missing")).toEqual([]);
    expect(engine.search("!?")).toEqual([]);
    expect(engine.stats()).toEqual({ documents: 4, terms: 2, postings: 4 });
  });
  test("sums terms across multiple fields, uses default boosts and preserves Unicode", () => {
    const engine = createSearchEngine<Product>(
      { id: "id", fields: { name: {}, description: {} } },
      [product("a", "Café apple", "apple banana"), product(1, "banana")],
    );
    expect(engine.search("apple banana")[0]?.score).toBe(3);
    expect(engine.search("cafe\u0301")[0]?.id).toBe("a");
    expect(engine.search("cafe")).toEqual([]);
  });
  test("supports initial document inference and independent instances", () => {
    const a = createSearchEngine(config, [product(1)]);
    const b = createSearchEngine<Product>(config);
    expect(a.search("apple")[0]?.document.name).toBe("apple");
    expect(b.stats().documents).toBe(0);
  });
});

describe("mutation invariants", () => {
  test("rejects duplicates atomically, including numeric/string identity", () => {
    const engine = createSearchEngine<Product>(config, [product(1)]);
    expect(() => engine.add([product(2), product(1)])).toThrow("duplicate");
    expect(() => engine.add([product(2), product(2)])).toThrow("duplicate");
    expect(() => engine.upsert([product(1, "pear"), product(1)])).toThrow(
      "duplicate",
    );
    expect(engine.search("apple").map((x) => x.id)).toEqual([1]);
    engine.add([product("1")]);
    expect(engine.stats().documents).toBe(2);
  });
  test("upsert removes stale terms, retains tie position, and can insert", () => {
    const engine = createSearchEngine<Product>(config, [
      product(1, "apple old"),
      product(2),
    ]);
    engine.upsert([product(1), product(3, "pear")]);
    expect(engine.search("old")).toEqual([]);
    expect(engine.search("apple").map((x) => x.id)).toEqual([1, 2]);
    expect(engine.stats()).toEqual({ documents: 3, terms: 2, postings: 3 });
    expect(engine.remove(1)).toBe(true);
    expect(engine.remove(1)).toBe(false);
    expect(engine.search("apple").map((x) => x.id)).toEqual([2]);
    engine.remove(2);
    expect(engine.stats()).toEqual({ documents: 1, terms: 1, postings: 1 });
    engine.clear();
    expect(engine.stats()).toEqual({ documents: 0, terms: 0, postings: 0 });
    engine.add([product(2), product(1)]);
    expect(engine.search("apple").map((x) => x.id)).toEqual([2, 1]);
  });
  test("invalid batch leaves documents and statistics unchanged", () => {
    const engine = createSearchEngine<Product>(config, [product(1)]);
    for (const id of ["", NaN, Infinity, -Infinity]) {
      expect(() => engine.upsert([product(1, "pear"), product(id)])).toThrow(
        "ID",
      );
    }
    expect(() =>
      engine.add([
        product(2),
        { ...product(3), name: 42 } as unknown as Product,
      ]),
    ).toThrow("name must be a string");
    expect(engine.search("apple").map((x) => x.id)).toEqual([1]);
    expect(engine.stats()).toEqual({ documents: 1, terms: 1, postings: 1 });
  });
  test("owns shallow documents, boosts and detached result arrays", () => {
    const source = product(1);
    const mutableConfig = { id: "id" as const, fields: { name: { boost: 3 } } };
    const engine = createSearchEngine<Product>(mutableConfig, [source]);
    source.name = "pear";
    mutableConfig.fields.name.boost = 99;
    const hit = engine.search("apple")[0]!;
    expect(hit.document.name).toBe("apple");
    expect(Object.isFrozen(hit.document)).toBe(true);
    expect(hit.score).toBe(3);
    expect(engine.search("pear")).toEqual([]);
    expect(engine.search("apple")).not.toBe(engine.search("apple"));
  });
  test("empty batches, empty indexed values and ID zero are valid", () => {
    const engine = createSearchEngine<Product>(config);
    engine.add([]);
    engine.upsert([]);
    engine.add([product(0, "", "")]);
    expect(engine.stats()).toEqual({ documents: 1, terms: 0, postings: 0 });
    expect(engine.remove(0)).toBe(true);
  });
  test("incremental mutations agree with a fresh index over a deterministic operation stream", () => {
    const engine = createSearchEngine<Product>(config);
    const live = new Map<number, Product>();
    let seed = 17;
    for (let i = 0; i < 200; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const id = seed % 23;
      if (seed % 3 === 0) {
        engine.remove(id);
        live.delete(id);
      } else {
        const p = product(id, `term${seed % 7}`, `term${seed % 11}`);
        engine.upsert([p]);
        live.set(id, p);
      }
      const fresh = createSearchEngine<Product>(config, [...live.values()]);
      expect(engine.stats()).toEqual(fresh.stats());
      expect(engine.search("term1 term2 term3")).toEqual(
        fresh.search("term1 term2 term3"),
      );
    }
  });
});

test("configuration errors are actionable", () => {
  expect(() =>
    createSearchEngine({ ...config, id: "" } as unknown as typeof config),
  ).toThrow("id must name");
  expect(() =>
    createSearchEngine({ ...config, id: 1 } as unknown as typeof config),
  ).toThrow("id must name");
  expect(() => createSearchEngine<Product>({ id: "id", fields: {} })).toThrow(
    "at least one",
  );
  for (const boost of [0, -1, NaN, Infinity])
    expect(() =>
      createSearchEngine<Product>({ id: "id", fields: { name: { boost } } }),
    ).toThrow("finite and positive");
});
