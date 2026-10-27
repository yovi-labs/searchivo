# R-ADR-002: Exact inverted index and mutation ownership

Store term → document → per-field frequencies. Each document owns a reverse term map that references the same frequency arrays; removal visits only that document's distinct terms. Keep field lengths for subsequent BM25. Duplicate document frequency data is unnecessary: posting-map size provides it.

Validate and tokenize an entire batch before applying any changes. Duplicate add IDs reject; upsert replaces while retaining original tie order; duplicate IDs within either batch reject. This promises validation atomicity, not recovery from process termination or out-of-memory. Preparing a batch temporarily holds the old index plus prepared data; benchmark transient heap separately from retained heap.

Copy/freeze each document shallowly. Indexed strings and IDs are isolated from subsequent caller assignments. Nested nonindexed data remains caller-owned; results must not be described as deep snapshots. Configuration field names and boosts are copied. Strings and finite numbers are distinct IDs (`1` differs from `'1'`). Empty strings, NaN and infinities are rejected.

Query uses unique normalized tokens and OR retrieval. Score is sum of field boost × frequency for matched terms; ties use insertion sequence, including across upserts. Empty/punctuation queries return no hits. No prefix, stemming, fuzzy or accent stripping in this slice.

Indexing is O(input characters + field frequencies), removal O(distinct document terms), retrieval O(matching postings × fields), sorting O(hits log hits). No full-document scan occurs for exact queries.
