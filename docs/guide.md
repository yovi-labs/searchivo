# Searchivo documentation

Fast search. Simple API. Searchivo is a TypeScript-first local search toolkit with optional integrations. Packages are private rebuild candidates; they are not published to npm. Use the repository workspace or validated local tarballs. No production website is deployed.

## Getting started

### Run the workspace

Use Node 24.22.1 and pnpm 11.28.9. Clone the repository's `develop` branch, then run `pnpm install --frozen-lockfile` and `pnpm build`. For the website, run `pnpm build:website` followed by `pnpm preview:website`. Open `/playground/` on the local preview to explore the same engine interactively.

Packages are not on public npm. In a separate consumer, install the exact tarballs from a validated private candidate together; Angular consumers also install its tested peers. Do not substitute an unverified registry package with the same name.

### Your first query

Configure an ID and searchable string fields, then index documents. Results contain the original ID, a shallow frozen document snapshot, and a numeric score.

```ts
import { createSearchEngine } from "@searchivo/core";

type Article = { id: number; title: string; body: string };
const search = createSearchEngine<Article>({
  id: "id",
  fields: { title: { boost: 3 }, body: {} },
});
search.add([{ id: 1, title: "Search that fits", body: "Typed local search" }]);
const results = search.search("typed");
export { results };
```

This query matches the `body` field. Searching `search` matches both fields, so the title boost contributes to its score. An empty query produces no hits. Use `upsert` to replace a document; `add` rejects duplicate IDs.

### Add capabilities progressively

The following complete example demonstrates the optional modules together. Both examples compile and execute against actual packed declarations during validation. Start with the imports you need; the core entry point does not load these optional modules.

```ts
import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { createFuzzySearch } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
import { refine } from "@searchivo/core/refinements";
import { createAutocomplete } from "@searchivo/core/suggestions";
import { localSource } from "@searchivo/core/source";
import { createSearchState } from "@searchivo/core/state";
import { explainSearch } from "@searchivo/core/explain";
type Product = { id: number; name: string; description: string; price: number };
const engine = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: {} },
  ranking: bm25(),
});
engine.add([
  {
    id: 1,
    name: "Apple iPhone",
    description: "Premium smartphone",
    price: 999,
  },
]);
const hits = engine.search("iphone");
const fuzzy = createFuzzySearch(engine)("iphnoe");
const ranges = highlight("Apple iPhone", fuzzy.terms.join(" "));
const page = refine(hits, {
  filters: [{ field: "price", op: "range", max: 1000 }],
  facets: ["price"],
  limit: 10,
});
const suggestions = createAutocomplete(engine)("iph");
const state = createSearchState(localSource(engine));
await state.search({ query: "iphone", limit: 10 });
const explanation = explainSearch(engine, "iphone");
state.dispose();
export { hits, ranges, page, suggestions, explanation };
```

## Indexing and ownership

Configure an explicit ID key and searchable string fields. Finite numbers and nonempty strings are valid IDs; 1 and "1" are distinct. add rejects duplicates in the batch or index. upsert inserts or replaces full documents and retains the original tie order. Duplicate IDs within an upsert batch reject. remove returns whether an ID existed; clear resets the index and insertion order.

Batches validate and tokenize before mutation, so validation failure leaves the index unchanged. This does not promise recovery from process termination or out-of-memory. Document snapshots are shallow copies and frozen at the top level. Indexed strings and IDs are isolated; nested nonindexed values remain caller-owned. Configuration field names and boosts are copied. Do not mutate the engine from a scoring callback or during vocabulary iteration.

## Query semantics and ranking

NFKC normalization and locale-independent lowercase precede Unicode letter/number/mark tokenization. Accents remain significant. There is no stemming or language-specific segmentation. Queries use OR matching; repeated terms count once. Empty/punctuation-only queries return no hits. Default score sums field boost × term frequency; ties follow insertion order.

BM25 is an optional entry point. It sums per-field contributions using document-level term frequency statistics across indexed fields, field lengths and average lengths. This field-weighted variant is not BM25F. k1 must be finite/positive, b must lie in [0,1]. Custom pure scorers receive frequency, document frequency/count, lengths and boost. Invalid or overflowing scores fail explicitly.

## Fuzzy matching and highlights

createFuzzySearch builds a derived trie lazily and refreshes it after mutations. It supports one insertion, deletion, substitution or adjacent transposition using Optimal String Alignment distance. Default limits are 128 candidates, 16 accepted expansions and 4096 visited nodes per token. Queries above 4096 UTF-16 code units reject; tokens above 64 code points receive exact matching only. A truncated response means corrections may have been omitted. Corrections currently receive the same ranking weight as exact terms.

highlight returns original-text half-open UTF-16 ranges, never HTML. Grapheme mappings preserve NFKC expansions, combining marks, Hangul Jamo and astral characters. Overlapping expansion ranges merge. This optional helper requires Intl.Segmenter. Render text nodes and mark elements using textContent; never inject result text as HTML.

## Filters, facets, sorting and pagination

refine operates on ranked results. Equality and membership values are typed to the selected scalar field; ranges are inclusive and numeric-only. Filters combine with AND. Facets count filtered results before pagination and are not disjunctive. No persistent facet index is kept.

Stable scalar sorting retains relevance order for equal values. String sorting uses JavaScript lexical order, not locale collation. Default offset is 0 and limit is 20; zero limit still returns totals/facets. Filtering currently follows ranking, so restrictive filters do not save ranking work. Empty query does not mean match-all browsing.

## Suggestions, debounce and state

createAutocomplete uses a lazy sorted dictionary and binary prefix lookup. Empty/multiple-token queries produce no suggestions. groupedSuggestions accepts named async sources, preserves group order and rejects the group if a source fails. Cancellation is checked before and after resolution.

createSearchState exposes query, results, loading, error, total, facets and duration. It combines cancellation with request generations so a transport ignoring abort cannot overwrite newer state. Previous results remain visible while loading. Dispose cancels and removes subscribers. Subscribers must not throw or mutate snapshots. createDebouncer accepts a platform scheduler returning a cancellation function; it is separate from the synchronous engine. The playground supplies minimum-length behavior as application policy.

## Angular

Use createSearchivo(source), add binding.provide() to component providers, import SearchivoInputDirective, and call binding.inject() in an injection context. The handle exposes readonly Signals and the typed controller. `<input searchivo>` preserves native markup and labels. Programmatic queries synchronize the input; IME composition commits on compositionend. DestroyRef disposes each scoped controller.

The runnable example is standalone, OnPush and zoneless. Tested compatibility is Angular 22.2.3, TypeScript 6.0.3 and Node 24.22.1. APF tarballs are validated with strict AOT templates. The library does not impose NgModules, CSS or combobox markup. The playground demonstrates keyboard-driven combobox behavior as a consumer.

## Workers

Construct the engine and custom strategies inside the worker. Attach attachWorkerRuntime with a document guard. Connect createWorkerClient through webTransport and acknowledge ready before use. Client/runtime entry points are separate and protocol version/IDs/payloads/results are validated. Worker errors reject pending work.

Abort abandons the reply, not synchronous CPU work or mutations. Client disposal terminates only when ownTransport=true; otherwise the caller owns the worker/port. Runtime dispose clears data and rejects future operations; the attachment disposer also removes the listener. The playground uses worker ranking with local fuzzy expansion/refinements and locally recomputed explanations, and labels that split explicitly.

## HTTP adapters

createHttpSource POSTs the typed request to an HTTP(S) endpoint. Supply a runtime document guard and facet-field allowlist. It validates envelopes, IDs, scores, totals, facets and metadata. Duplicate result IDs reject. A separate cancellation/timeout race rejects even if fetch ignores abort; timers and listeners are cleaned up.

Authentication can be supplied by a custom fetch wrapper. No credentials or provider-specific APIs are assumed. This project is a toolkit, not a distributed search server. Use createSearchState with the source to guard async races.

## Explanations and DevTools

explainSearch records real per-field/per-term contributions with boosts and final results. Supply expandedTerms from fuzzy search when needed. Normal search allocates no explanation records; the base engine only checks for an optional observer. Timings name normalization and instrumented search, including capture overhead. Supply a high-resolution clock if desired.

recordSearch stores bounded local state summaries without documents or remote telemetry. Dispose the recorder to remove its subscription. The optional modules do not enter basic consumer bundles.

## Themes and accessibility

Optional CSS lives in @searchivo/themes/css and applies only within searchivo-theme. The Sass entry exposes a tokens mixin through the NodePackageImporter. Core and framework behavior work without styles. Consumers own labels, focus, keyboard navigation and live regions. Browser/axe checks cover the included examples, not every possible integration.

## Performance methodology

Seeded 1k/10k/100k fixtures cover repeated vocabulary and high-cardinality dictionaries. Reports preserve environment, revision, dirty state, warmups and raw samples. Retained heap follows explicit GC; post-index samples are not peak allocations. Worker startup/clone/acknowledgment/round trips are measured separately. Small heap differences may be negative due to GC noise. Fixtures are synthetic and do not promise production latency.

The trie replaced a measured memory-heavy deletion-key index. Both reports remain available. Basic consumer bundle sizes are measured raw/gzip/Brotli and checked against the unchanged 5KB gzip budget. Cross-machine timing comparisons are not regression evidence; performance safeguards also enforce bounded fuzzy traversal and stable operation semantics.

## Migration and troubleshooting

The rebuild is pre-1.0 and unpublished. APIs may change during candidate review; changes must be recorded in changelogs. Historical implementation reports do not describe this source. Public npm publication, releases and deployment require separate approval.

No results: check the configured string fields, exact token semantics, accents and minimum length. Duplicate IDs: use upsert for replacement or fix the batch. Stale nested data: snapshots are shallow. Slow first fuzzy query: derived indexes rebuild after mutations; keep heavy indexing off the UI thread. Angular injection errors: provide the binding in the same scope as the directive. Worker silence: verify module URL, message protocol, runtime attachment and document guard. Remote validation errors: compare your response with the documented source shape. Unexpected rankings: inspect actual contributions with explainSearch.
