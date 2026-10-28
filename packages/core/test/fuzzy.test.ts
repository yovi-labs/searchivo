import { expect, test } from "vitest";
import { createSearchEngine } from "../src/index.js";
import { createFuzzySearch, withinOneEdit } from "../src/fuzzy.js";
import { highlight } from "../src/highlight.js";

test("one-edit matcher handles all edit types, nonmatches and codepoints", () => {
  for (const [a, b, expected] of [
    ["", "", true],
    ["", "a", true],
    ["ab", "", false],
    ["cat", "cat", true],
    ["cat", "cut", true],
    ["cat", "ca", true],
    ["ca", "cat", true],
    ["cat", "cart", true],
    ["cart", "cat", true],
    ["cat", "act", true],
    ["abc", "bad", false],
    ["abc", "adc", true],
    ["abc", "axx", false],
    ["ab", "cab", true],
    ["ab", "cda", false],
    ["abc", "ca", false],
    ["a😀b", "ab", true],
  ] as const)
    expect(withinOneEdit(a, b), `${a}/${b}`).toBe(expected);
});
test("one-edit matcher agrees with an independent OSA matrix over small strings", () => {
  const words = [
    "",
    "a",
    "b",
    "aa",
    "ab",
    "ba",
    "bb",
    "aab",
    "aba",
    "baa",
    "bbb",
  ];
  const distance = (a: string, b: string) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) =>
        i === 0 ? j : j === 0 ? i : 0,
      ),
    );
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++) {
        d[i]![j] = Math.min(
          d[i - 1]![j]! + 1,
          d[i]![j - 1]! + 1,
          d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
          d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    return d[a.length]![b.length]!;
  };
  for (const a of words)
    for (const b of words)
      expect(withinOneEdit(a, b), `${a}/${b}`).toBe(distance(a, b) <= 1);
});
test("fuzzy search refreshes after mutations and bounds corrections", () => {
  const engine = createSearchEngine({ id: "id", fields: { text: {} } }, [
    { id: 1, text: "iphone" },
    { id: 2, text: "phone" },
    { id: 3, text: "iphones" },
  ]);
  const search = createFuzzySearch(engine);
  expect(search("iphnoe").results[0]?.id).toBe(1);
  expect(search("iphne").results[0]?.id).toBe(1);
  expect(search("iphone").terms).toContain("phone");
  expect(search("absent").results).toEqual([]);
  engine.remove(1);
  expect(search("iphnoe").results).toEqual([]);
  engine.add([{ id: 4, text: "iphnoe" }]);
  expect(search("iphnoe").results[0]?.id).toBe(4);
  expect(
    createFuzzySearch(engine, { maxCandidates: 1, maxExpansions: 1 })("phone")
      .truncated,
  ).toBe(false);
  engine.clear();
  expect(search("").results).toEqual([]);
});
test("candidate false positives, duplicate keys, caps and oversized terms", () => {
  const engine = createSearchEngine(
    { id: "id", fields: { text: {} } },
    ["ab", "ba", "ac", "bc", "bb", "aaa", "a".repeat(65)].map((text, id) => ({
      id,
      text,
    })),
  );
  expect(createFuzzySearch(engine)("ab").terms).not.toContain("bc");
  expect(createFuzzySearch(engine)("a".repeat(65)).results).toHaveLength(1);
  expect(createFuzzySearch(engine, { maxCandidates: 1 })("ab").truncated).toBe(
    true,
  );
  expect(createFuzzySearch(engine, { maxExpansions: 1 })("ab").truncated).toBe(
    true,
  );
  expect(() => createFuzzySearch(engine)("a".repeat(4097))).toThrow("4096");
  for (const maxCandidates of [0, -1, 1.5, NaN, 4097])
    expect(() => createFuzzySearch(engine, { maxCandidates })).toThrow(
      "integer",
    );
  expect(() => createFuzzySearch(engine, { maxExpansions: 0 })).toThrow(
    "maxExpansions",
  );
});
test("highlight preserves original UTF-16 ranges and returns no HTML", () => {
  const text = "😀 Ａpple cafe\u0301 <b>phone</b> 𐐀";
  const ranges = highlight(text, "apple café phone 𐐨");
  expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual([
    "Ａpple",
    "cafe\u0301",
    "phone",
    "𐐀",
  ]);
  expect(ranges[0]?.start).toBe(3);
  expect(highlight(text, "missing")).toEqual([]);
  expect(highlight("", "")).toEqual([]);
  expect(highlight("ﬃ", "ffi")).toEqual([{ start: 0, end: 1 }]);
  expect(highlight("Ⓐ ½", "a 1 2")).toEqual([
    { start: 0, end: 1 },
    { start: 2, end: 3 },
  ]);
  expect(highlight("ΟΣ İ 가", "ος i̇ 가")).toEqual([
    { start: 0, end: 2 },
    { start: 3, end: 4 },
    { start: 5, end: 7 },
  ]);
});
test("trie pruning preserves all one-edit matches and enforces traversal bounds", () => {
  const words = [
    "a",
    "b",
    "aa",
    "ab",
    "ba",
    "bb",
    "aaa",
    "aab",
    "aba",
    "abb",
    "baa",
    "bab",
    "bba",
    "bbb",
  ];
  const engine = createSearchEngine(
    { id: "id", fields: { text: {} } },
    words.map((text, id) => ({ id, text })),
  );
  const fuzzy = createFuzzySearch(engine, { maxExpansions: 100 });
  for (const query of words)
    expect(
      fuzzy(query)
        .results.map((hit) => hit.document.text)
        .sort(),
    ).toEqual(words.filter((word) => withinOneEdit(query, word)).sort());
  expect(
    createFuzzySearch(engine, { maxVisitedNodes: 1 })("aaa").truncated,
  ).toBe(true);
  expect(() => createFuzzySearch(engine, { maxVisitedNodes: 0 })).toThrow(
    "maxVisitedNodes",
  );
});
