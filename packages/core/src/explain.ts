import { tokenize } from "./tokenize.js";
import type { ScoreContribution, SearchEngine, SearchResult } from "./types.js";
/** Explicit explanation output. Timings include instrumentation overhead. */
export interface SearchExplanation<T> {
  readonly normalizedQuery: string;
  readonly tokens: readonly string[];
  readonly expandedTerms: readonly string[];
  readonly results: readonly SearchResult<T>[];
  readonly contributions: readonly ScoreContribution[];
  readonly timings: {
    readonly normalizationMs: number;
    readonly instrumentedSearchMs: number;
  };
}
/** Explain an actual engine query. Supply fuzzy response terms to explain expanded retrieval. */
export function explainSearch<T>(
  engine: SearchEngine<T>,
  query: string,
  options: {
    readonly expandedTerms?: readonly string[];
    readonly now?: () => number;
  } = {},
): SearchExplanation<T> {
  const now = options.now ?? Date.now;
  const start = now();
  const normalizedQuery = query.normalize("NFKC").toLowerCase();
  const tokens = [...new Set(tokenize(query))];
  const expandedTerms = options.expandedTerms ?? tokens;
  const normalized = now();
  const contributions: ScoreContribution[] = [];
  const results = engine.search(expandedTerms.join(" "), (contribution) =>
    contributions.push(contribution),
  );
  const complete = now();
  return {
    normalizedQuery,
    tokens,
    expandedTerms: [...expandedTerms],
    results,
    contributions,
    timings: {
      normalizationMs: normalized - start,
      instrumentedSearchMs: complete - normalized,
    },
  };
}
