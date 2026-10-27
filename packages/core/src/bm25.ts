import type { RankingStrategy } from "./types.js";
/** BM25 saturation and field-length normalization parameters. */
export interface BM25Options {
  /** Finite positive saturation parameter, default 1.2. */
  readonly k1?: number;
  /** Length-normalization strength in [0, 1], default 0.75. */
  readonly b?: number;
}
/** Field-weighted BM25 with document-level term frequency across all indexed fields. */
export function bm25({
  k1 = 1.2,
  b = 0.75,
}: BM25Options = {}): RankingStrategy {
  if (!Number.isFinite(k1) || k1 <= 0)
    throw new Error("BM25 k1 must be finite and positive");
  if (!Number.isFinite(b) || b < 0 || b > 1)
    throw new Error("BM25 b must be finite and between 0 and 1");
  return ({
    frequency,
    documentFrequency,
    documentCount,
    fieldLength,
    averageFieldLength,
    boost,
  }) => {
    const idf = Math.log1p(
      (documentCount - documentFrequency + 0.5) / (documentFrequency + 0.5),
    );
    return (
      (boost * idf * (frequency * (k1 + 1))) /
      (frequency + k1 * (1 - b + (b * fieldLength) / averageFieldLength))
    );
  };
}
