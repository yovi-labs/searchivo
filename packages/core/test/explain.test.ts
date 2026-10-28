import { expect, test } from "vitest";
import { createSearchEngine } from "../src/index.js";
import { bm25 } from "../src/bm25.js";
import { explainSearch } from "../src/explain.js";
test("explanations match real default/BM25 scores and name only measured timings", () => {
  for (const ranking of [undefined, bm25()]) {
    const config = {
      id: "id" as const,
      fields: { name: { boost: 3 }, description: {} },
      ...(ranking ? { ranking } : {}),
    };
    const engine = createSearchEngine(config, [
      { id: 1, name: "Apple phone", description: "phone" },
      { id: 2, name: "phone", description: "" },
    ]);
    let tick = 0;
    const explained = explainSearch(engine, "PHONE", { now: () => ++tick });
    expect(explained.results).toEqual(engine.search("phone"));
    for (const result of explained.results)
      expect(
        explained.contributions
          .filter((c) => c.id === result.id)
          .reduce((sum, c) => sum + c.score, 0),
      ).toBeCloseTo(result.score);
    expect(explained.normalizedQuery).toBe("phone");
    expect(explained.tokens).toEqual(["phone"]);
    expect(explained.timings).toEqual({
      normalizationMs: 1,
      instrumentedSearchMs: 1,
    });
    expect(explained.contributions[0]).toMatchObject({
      field: "name",
      boost: 3,
      frequency: 1,
    });
    expect(
      explainSearch(engine, "phnoe", { expandedTerms: ["phone"] }).results,
    ).toHaveLength(2);
    expect(explainSearch(engine, "").contributions).toEqual([]);
  }
});
