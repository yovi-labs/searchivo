import { tokenize } from "./tokenize.js";
/** Half-open original UTF-16 range. Safe to render with text nodes, never HTML. */
export interface HighlightRange {
  readonly start: number;
  readonly end: number;
}
/** Highlight normalized tokens with ranges mapped back through original graphemes.
 * Compatibility expansions may share one original range. Accents remain significant.
 */
export function highlight(
  text: string,
  query: string,
): readonly HighlightRange[] {
  const terms = new Set(tokenize(query));
  const ranges: HighlightRange[] = [];
  const starts: number[] = [],
    ends: number[] = [];
  let normalized = "";
  for (const part of new Intl.Segmenter("und", {
    granularity: "grapheme",
  }).segment(text)) {
    const chunk = part.segment.normalize("NFKC");
    normalized += chunk;
    for (let i = 0; i < chunk.toLowerCase().length; i++) {
      starts.push(part.index);
      ends.push(part.index + part.segment.length);
    }
  }
  for (const match of normalized
    .toLowerCase()
    .matchAll(/[\p{L}\p{N}\p{M}]+/gu)) {
    if (!terms.has(match[0])) continue;
    const start = starts[match.index]!,
      end = ends[match.index + match[0].length - 1]!;
    const previous = ranges[ranges.length - 1];
    if (previous && start < previous.end)
      ranges[ranges.length - 1] = { start: previous.start, end };
    else ranges.push({ start, end });
  }
  return ranges;
}
