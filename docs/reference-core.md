# Core API reference

Use the [first-search tutorial](tutorial.md) for installation and a complete working index. This reference covers retrieval and ranking. The [generated API reference](https://searchivo.netlify.app/api/) contains exact current declarations, including all exported types. [Source](https://github.com/yovi-labs/searchivo/tree/develop/packages/core/src) · [live feature lab](https://searchivo.netlify.app/#features).

## Engine and tokenization

Import `createSearchEngine`, `tokenize` and the following types from `@searchivo/core`.

| Export                                        | Contract                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createSearchEngine<T>(config, initial = [])` | Returns `SearchEngine<T>`; validates configuration and the entire initial batch. No indexing options are inferred.                                                                               |
| `SearchConfig<T>`                             | `id`: string key holding a `DocumentId`; `fields`: nonempty map of searchable string keys to `FieldOptions`; optional pure `ranking: RankingStrategy`. Configuration keys and boosts are copied. |
| `FieldOptions`                                | `boost = 1`, finite and strictly positive. A boost is a multiplier, not an exact-match preference.                                                                                               |
| `DocumentId`                                  | Finite number or nonempty string. `1` and `"1"` differ. Whitespace strings are nonempty.                                                                                                         |
| `KeysOfType<T, V>`                            | Extracts string keys with values assignable to `V`; optional fields are generally excluded because they include `undefined`.                                                                     |
| `SearchResult<T>`                             | Readonly `{ id, document: Readonly<T>, score }`. The snapshot is shallow, frozen at the top level; nested values remain caller-owned.                                                            |
| `IndexStats`                                  | `{ documents, terms, postings }`; a posting is one term/document pair, including a field-frequency array.                                                                                        |
| `tokenize(text)`                              | Returns a new string array: NFKC → locale-independent lowercase → Unicode letters/numbers/marks. Repetitions are retained in this helper.                                                        |

`SearchEngine<T>` methods:

| Method                    | Returns and behavior                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `add(documents)`          | `void`; rejects duplicates within the batch or current index; validates/tokenizes before applying any changes.                                 |
| `upsert(documents)`       | `void`; inserts or fully replaces documents. Duplicate batch IDs reject; replacements retain insertion tie order. This is not a partial patch. |
| `remove(id)`              | Boolean indicating whether the document existed.                                                                                               |
| `clear()`                 | `void`; clears documents and dictionary, resets insertion order, increments revision.                                                          |
| `search(query, observe?)` | Readonly array of ranked hits. Optional observer gets each actual `ScoreContribution`. Throws for invalid/overflowing scores.                  |
| `stats()`                 | Detached `IndexStats` object.                                                                                                                  |
| `version()`               | Monotonic mutation revision, useful for derived-index invalidation; no-op operations need not increment it.                                    |
| `vocabulary()`            | Iterable of current normalized terms. Do not mutate the engine during iteration.                                                               |

Query terms combine with **OR**, repeated query terms count once, and empty/punctuation-only queries return no hits. Matching is whole-token equality: `phone` does not match `smartphone`; use suggestions for prefixes or fuzzy search for one-edit spelling differences. Accents remain significant. There is no phrase syntax, stemming, synonym expansion or language-specific segmentation. Emoji separate tokens. Tie scores use document insertion order, independent of query-term order. Default score sums frequency × field boost.

## BM25 and custom ranking

Import `bm25` and `BM25Options` from `@searchivo/core/bm25`. `bm25({ k1 = 1.2, b = 0.75 } = {})` returns a `RankingStrategy`. `k1` must be finite and positive; `b` must be finite in `[0, 1]`. Invalid options throw at construction. Pass the strategy as `SearchConfig.ranking`.

`RankingStrategy` and `RankingContext` are core exports. The callback receives positive `frequency`, `documentFrequency`, `documentCount`, `fieldLength`, `averageFieldLength` and `boost`, and must return a finite nonnegative number. Keep it pure: do not mutate the engine from the callback. BM25 sums field-weighted contributions using document frequency across indexed fields; it is not BM25F and does not make fuzzy matches weaker than exact matches. Explanations reveal the actual contributions.

```ts
import { createSearchEngine, type RankingStrategy } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { explainSearch } from "@searchivo/core/explain";
const engine = createSearchEngine(
  {
    id: "id",
    fields: { title: { boost: 4 }, body: {} },
    ranking: bm25({ k1: 1.2, b: 0.75 }),
  },
  [
    { id: 1, title: "Typed search", body: "Small local engine" },
    { id: 2, title: "Indexing", body: "Search search search" },
  ],
);
const explanation = explainSearch(engine, "search", {
  now: () => performance.now(),
});
const custom: RankingStrategy = ({ frequency, boost }) =>
  Math.sqrt(frequency) * boost;
export { explanation, custom };
```

## Fuzzy matching

Import `createFuzzySearch`, `withinOneEdit`, `FuzzyOptions` and `FuzzyResponse<T>` from `@searchivo/core/fuzzy`.

`createFuzzySearch(engine, options = {})` returns a reusable `(query) => FuzzyResponse<T>` closure. Keep that closure between searches: its trie is built lazily, then rebuilt only after engine mutations. All option limits are safe integers in `[1, 4096]`: `maxCandidates = 128`, `maxExpansions = 16`, `maxVisitedNodes = 4096`, each applied per query token. Original tokens are always retained. `terms` contains originals and accepted dictionary corrections; `results` ranks the expanded query; `truncated` means corrections may have been omitted. Candidate and expansion caps both bound accepted matches in this implementation.

The distance is Optimal String Alignment with at most one insertion, deletion, substitution or adjacent transposition, using Unicode code points. `withinOneEdit(left, right)` returns a boolean using the strings as supplied; it does not tokenize or normalize. Queries longer than 4096 UTF-16 units throw. Tokens over 64 code points use exact matching only. Trie traversal is bounded, but building the trie and ranking expanded postings are separate costs.

```ts
import { createSearchEngine } from "@searchivo/core";
import { createFuzzySearch, withinOneEdit } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
const engine = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "Wireless headphones" },
]);
const fuzzy = createFuzzySearch(engine);
const exact = engine.search("headphnoes");
const response = exact.length
  ? { results: exact, terms: ["headphnoes"], truncated: false }
  : fuzzy("headphnoes");
const ranges = highlight("Wireless headphones", response.terms.join(" "));
if (!withinOneEdit("headphnoes", "headphones"))
  throw new Error("Expected transposition");
export { response, ranges };
```

The catalog applies fuzzy search only when exact retrieval is empty. The general fuzzy helper also expands queries that have exact hits. Explain that difference in your UI; do not promise typo recovery for arbitrary spelling errors.

## Safe highlighting

Import `highlight` and `HighlightRange` from `@searchivo/core/highlight`. `highlight(text, query)` returns `{ start, end }[]`, half-open UTF-16 ranges into the **original** text. It matches normalized whole tokens; it does not create HTML, fuzzy-expand, or return escaped strings. Pass fuzzy `terms.join(" ")` when you want corrected terms highlighted. Empty-token queries return `[]` without segmenting the text.

Use `text.slice(start, end)` inside Angular interpolation or DOM text nodes, wrapping only the range in a `mark` element. Never use untrusted document text with `innerHTML` or Angular trust-bypass APIs. Grapheme mapping handles compatibility expansions, combining marks and astral characters; overlapping expansion ranges merge. `Intl.Segmenter` is required for nonempty queries. The catalog's source demonstrates a full text/range renderer; [security guidance](security.md) explains the boundary.
