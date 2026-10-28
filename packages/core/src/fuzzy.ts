import { tokenize } from "./tokenize.js";
import type { SearchEngine, SearchResult } from "./types.js";
/** Limits for one-edit matching, using Unicode code points. */
export interface FuzzyOptions {
  /** Maximum dictionary candidates evaluated per query token; default 128. */
  readonly maxCandidates?: number;
  /** Maximum accepted corrections per token; default 16. */
  readonly maxExpansions?: number;
  /** Maximum trie nodes visited per query token; default 4096. */
  readonly maxVisitedNodes?: number;
}
/** A query expansion with deterministic trie-traversal corrections. */
export interface FuzzyResponse<T> {
  readonly results: readonly SearchResult<T>[];
  readonly terms: readonly string[];
  /** True when candidate or expansion limits may have omitted corrections. */
  readonly truncated: boolean;
}

interface Trie {
  children: Map<string, Trie>;
  term?: string;
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

/** Create a lazy bounded trie index. One edit; terms >64 code points use exact matching only. */
export function createFuzzySearch<T>(
  engine: SearchEngine<T>,
  {
    maxCandidates = 128,
    maxExpansions = 16,
    maxVisitedNodes = 4096,
  }: FuzzyOptions = {},
): (query: string) => FuzzyResponse<T> {
  for (const [name, value] of Object.entries({
    maxCandidates,
    maxExpansions,
    maxVisitedNodes,
  }))
    if (!Number.isSafeInteger(value) || value < 1 || value > 4096)
      throw new Error(`${name} must be an integer in [1, 4096]`);
  let revision = -1;
  const root: Trie = { children: new Map() };
  return (query) => {
    if (query.length > 4096)
      throw new Error("fuzzy query must not exceed 4096 UTF-16 code units");
    if (revision !== engine.version()) {
      root.children.clear();
      for (const term of engine.vocabulary()) {
        if ([...term].length > 64) continue;
        let node = root;
        for (const char of term) {
          let child = node.children.get(char);
          if (!child) {
            child = { children: new Map() };
            node.children.set(char, child);
          }
          node = child;
        }
        node.term = term;
      }
      revision = engine.version();
    }
    const terms = new Set(tokenize(query));
    let truncated = false;
    for (const token of [...terms]) {
      if ([...token].length > 64) continue;
      const chars = [...token];
      let candidates = 0,
        expansions = 0,
        visited = 0,
        stopped = false;
      function visit(
        node: Trie,
        char: string,
        previous: readonly number[],
        beforePrevious: readonly number[] | undefined,
        previousChar: string,
      ): void {
        if (stopped) return;
        if (visited === maxVisitedNodes) {
          truncated = true;
          stopped = true;
          return;
        }
        visited++;
        const row = [previous[0]! + 1];
        for (let j = 1; j <= chars.length; j++) {
          let cost = Math.min(
            row[j - 1]! + 1,
            previous[j]! + 1,
            previous[j - 1]! + (char === chars[j - 1] ? 0 : 1),
          );
          if (
            beforePrevious &&
            j > 1 &&
            char === chars[j - 2] &&
            previousChar === chars[j - 1]
          )
            cost = Math.min(cost, beforePrevious[j - 2]! + 1);
          row.push(cost);
        }
        if (
          node.term !== undefined &&
          node.term !== token &&
          row[chars.length]! <= 1
        ) {
          if (candidates === maxCandidates || expansions === maxExpansions) {
            truncated = true;
            stopped = true;
            return;
          }
          candidates++;
          terms.add(node.term);
          expansions++;
        }
        if (Math.min(...row) <= 1)
          for (const [nextChar, child] of node.children)
            visit(child, nextChar, row, previous, char);
      }
      const first = Array.from({ length: chars.length + 1 }, (_, i) => i);
      for (const [char, node] of root.children)
        visit(node, char, first, undefined, "");
    }
    return {
      results: engine.search([...terms].join(" ")),
      terms: [...terms],
      truncated,
    };
  };
}
