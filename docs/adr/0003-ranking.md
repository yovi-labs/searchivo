# R-ADR-003: Field-weighted BM25

Use an optional per-field ranking function, with frequency, document frequency, corpus count, field length/average and boost. Default scoring avoids allocating these context objects. Neither path creates explanations.

BM25 is exported only from `@searchivo/core/bm25`; the root never imports it. For each matched field, score = boost × log(1 + (N - df + 0.5)/(df + 0.5)) × tf × (k1 + 1) / (tf + k1 × (1 - b + b × dl/avgdl)). Sum contributions over distinct query terms and fields. Here df counts documents containing the term in any indexed field, not separate per-field df. This is a field-weighted variant, not BM25F. Empty fields are skipped because tf is zero, so avgdl cannot be zero for an evaluated field.

Maintain aggregate field lengths incrementally rather than scanning documents per query. Validate parameters, finite/nonnegative strategy output and summed overflow. Custom strategies are pure caller-owned functions; they must not mutate the engine during search. Numerical oracle tests are independent of the scorer implementation.
