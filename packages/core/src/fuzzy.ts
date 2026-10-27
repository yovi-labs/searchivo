import { tokenize } from "./tokenize.js";
import type { SearchEngine, SearchResult } from "./types.js";
/** Limits for one-edit matching, using Unicode code points. */
export interface FuzzyOptions {
  /** Maximum dictionary candidates evaluated per query token; default 128. */
  readonly maxCandidates?: number;
  /** Maximum accepted corrections per token; default 16. */
  readonly maxExpansions?: number;
}
/** A query expansion with deterministic dictionary-insertion-order corrections. */
export interface FuzzyResponse<T> {
  readonly results: readonly SearchResult<T>[];
  readonly terms: readonly string[];
  /** True when candidate or expansion limits may have omitted corrections. */
  readonly truncated: boolean;
}

function keys(term: string): Set<string> {
  const chars = [...term];
  return new Set([
    term,
    ...chars.map((_, i) =>
      chars
        .slice(0, i)
        .concat(chars.slice(i + 1))
        .join(""),
    ),
  ]);
}

/** Whether two terms have Optimal String Alignment distance at most one. */
export function withinOneEdit(left: string, right: string): boolean {
  const a = [...left],
    b = [...right];
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (i === a.length) return true;
  if (a.length === b.length) {
    if (a.slice(i + 1).join("") === b.slice(i + 1).join("")) return true;
    return (
      a[i] === b[i + 1] &&
      a[i + 1] === b[i] &&
      a.slice(i + 2).join("") === b.slice(i + 2).join("")
    );
  }
  return a.length > b.length
    ? a.slice(i + 1).join("") === b.slice(i).join("")
    : a.slice(i).join("") === b.slice(i + 1).join("");
}

/** Create a lazy deletion-key index. One edit; terms >64 code points use exact matching only. */
export function createFuzzySearch<T>(
  engine: SearchEngine<T>,
  { maxCandidates = 128, maxExpansions = 16 }: FuzzyOptions = {},
): (query: string) => FuzzyResponse<T> {
  for (const [name, value] of Object.entries({ maxCandidates, maxExpansions }))
    if (!Number.isSafeInteger(value) || value < 1 || value > 4096)
      throw new Error(`${name} must be an integer in [1, 4096]`);
  let revision = -1;
  const buckets = new Map<string, Set<string>>();
  return (query) => {
    if (query.length > 4096)
      throw new Error("fuzzy query must not exceed 4096 UTF-16 code units");
    if (revision !== engine.version()) {
      buckets.clear();
      for (const term of engine.vocabulary()) {
        if ([...term].length > 64) continue;
        for (const key of keys(term)) {
          let bucket = buckets.get(key);
          if (!bucket) {
            bucket = new Set();
            buckets.set(key, bucket);
          }
          bucket.add(term);
        }
      }
      revision = engine.version();
    }
    const terms = new Set(tokenize(query));
    let truncated = false;
    for (const token of [...terms]) {
      if ([...token].length > 64) continue;
      const candidates = new Set<string>();
      let expansions = 0;
      outer: for (const key of keys(token)) {
        const bucket = buckets.get(key);
        if (!bucket) continue;
        for (const term of bucket) {
          if (term === token || candidates.has(term)) continue;
          if (
            candidates.size === maxCandidates ||
            expansions === maxExpansions
          ) {
            truncated = true;
            break outer;
          }
          candidates.add(term);
          if (withinOneEdit(token, term)) {
            terms.add(term);
            expansions++;
          }
        }
      }
    }
    return {
      results: engine.search([...terms].join(" ")),
      terms: [...terms],
      truncated,
    };
  };
}
