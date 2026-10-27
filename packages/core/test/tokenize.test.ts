import { expect, test } from "vitest";
import { tokenize } from "../src/index.js";

test("normalizes compatibility characters, Unicode words and casing", () => {
  expect(tokenize("Ａpple CAFÉ cafe\u0301 مرحبا 42!")).toEqual([
    "apple",
    "café",
    "café",
    "مرحبا",
    "42",
  ]);
});
test("handles empty and punctuation-only input", () => {
  expect(tokenize("")).toEqual([]);
  expect(tokenize("!? 🙂")).toEqual([]);
});
