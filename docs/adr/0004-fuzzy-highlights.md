# R-ADR-004: Bounded derived fuzzy index and whole-token ranges

## Rebuild performance revision — October 28

The deletion-key design below is retained as history and has been replaced by a trie. Query traversal computes bounded Optimal String Alignment rows with prefix pruning, plus explicit maxVisitedNodes (default 4096), maxCandidates and maxExpansions caps. Trie order determines corrections. Oversized tokens still use exact matching. Cold construction remains lazy and invalidates on mutations.

The same seeded 100k high-cardinality fixture on the recorded Windows host measured roughly 29 MB retained fuzzy heap and 27 ms cold construction versus the earlier ~167 MB and ~618 ms deletion-key sample. These are individual machine-specific samples, not universal ratios or peak allocation claims. Small retained-heap deltas can be negative due to GC noise; reports preserve them. Exhaustive small-alphabet tests compare trie results with the independent one-edit predicate.

## Original deletion-key decision (superseded)

Use deletion-key buckets for optional one-edit candidate retrieval, followed by a code-point Optimal String Alignment distance≤1 predicate. This covers insertions, deletions, substitutions and adjacent transpositions. It is not unrestricted Damerau distance or multi-edit matching. Candidate evaluation defaults to 128 and accepted expansions to 16 per term; truncation is explicit. Query length is capped at 4096 UTF-16 units; dictionary/query tokens above 64 code points receive exact matching only.

Build the derived index lazily and invalidate via the engine revision. This increases retained memory by deletion keys and makes the first fuzzy query after a mutation expensive. It avoids blind dictionary scans for warm queries. Benchmark cold/warm behavior independently before accepting this representation for high-cardinality use. Corrections have equal ranking weight to exact terms in this initial API; no undocumented distance-based score is applied.

Highlights use Intl.Segmenter graphemes to map NFKC expansions back to original UTF-16 spans. Lowercase is applied across the normalized text to preserve context-sensitive Greek final sigma. Token ranges map to whole original graphemes, and overlapping compatibility-expansion ranges are merged. Tests include circled letters, fractions, ligatures, combining marks, Hangul Jamo, Greek and astral characters. This optional entry point requires Intl.Segmenter; the base engine does not. Rendering belongs to consumers and never uses HTML. Use fuzzy response terms as the highlight query to show corrections.
