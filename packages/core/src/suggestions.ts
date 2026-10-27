import { tokenize } from "./tokenize.js";
import type { SearchEngine } from "./types.js";
import type { CancellationSignal } from "./source.js";
/** Prefix lookup over a lazily sorted dictionary. Empty/multi-token queries return no suggestions. */
export function createAutocomplete<T>(
  engine: SearchEngine<T>,
): (query: string, limit?: number) => readonly string[] {
  let version = -1;
  let dictionary: string[] = [];
  return (query, limit = 10) => {
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > 1000)
      throw new Error("suggestion limit must be an integer in [0, 1000]");
    const tokens = tokenize(query);
    if (tokens.length !== 1) return [];
    if (version !== engine.version()) {
      dictionary = [...engine.vocabulary()].sort();
      version = engine.version();
    }
    const prefix = tokens[0]!;
    let low = 0,
      high = dictionary.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (dictionary[middle]! < prefix) low = middle + 1;
      else high = middle;
    }
    const results: string[] = [];
    while (
      low < dictionary.length &&
      results.length < limit &&
      dictionary[low]!.startsWith(prefix)
    )
      results.push(dictionary[low++]!);
    return results;
  };
}
/** Named suggestions returned by an async group source. */
export interface SuggestionGroup {
  readonly label: string;
  readonly suggestions: readonly string[];
}
/** Async custom suggestion provider. */
export interface SuggestionSource {
  readonly label: string;
  readonly suggest: (
    query: string,
    signal: CancellationSignal,
  ) => Promise<readonly string[]>;
}
/** Resolve groups in configured order, rejecting on cancellation or any source failure. */
export async function groupedSuggestions(
  sources: readonly SuggestionSource[],
  query: string,
  signal: CancellationSignal,
): Promise<readonly SuggestionGroup[]> {
  if (signal.aborted) throw new Error("Suggestions cancelled");
  const groups = await Promise.all(
    sources.map(async (source) => ({
      label: source.label,
      suggestions: await source.suggest(query, signal),
    })),
  );
  if (signal.aborted) throw new Error("Suggestions cancelled");
  return groups;
}
