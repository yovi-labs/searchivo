# How Searchivo fits your Angular app

Searchivo turns the data your application already has into ranked results. Your Angular components own the interface; the library handles indexing, relevance and search state. Use it for product discovery, searchable tables, help centers or an in-app command menu.

## Getting started

### Install in your Angular application

```sh
npm install @searchivo/core@0.1.0 @searchivo/angular@0.1.0
```

> **Release availability:** 0.1.0 is awaiting npm publication. Use this command once the release is published. Angular compatibility is tested with 22.2.3.

Start with [the installation tutorial](tutorial.md), then add [the complete Angular component](angular.md). You install Searchivo as a dependency in your own project.

### Your first query

Choose the fields users recognize. A help center might search a title and body; a catalog might search a product name and description. Give titles a boost when a title match should matter more.

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

The result includes the document, its stable ID and its relevance score. Render `hit.document.title` in your Angular template. An empty query returns no hits; showing all records before someone types is an application choice.

### Add capabilities progressively

Start with exact search. Add a feature when it solves a concrete problem: BM25 for longer documents, fuzzy matching for typos, filters for narrowing a catalog, or suggestions while someone types. Optional imports stay separate from the basic engine.

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

**An index is a searchable view of your data.** Configure the ID and searchable string fields, then add documents once. Reuse the engine across queries instead of rebuilding it on every keystroke.

| When your data changes   | Use                 | Result                                            |
| ------------------------ | ------------------- | ------------------------------------------------- |
| New records arrive       | `add(documents)`    | Indexes new IDs; duplicate IDs reject.            |
| A record is edited       | `upsert(documents)` | Replaces the full document, or inserts it if new. |
| A record is deleted      | `remove(id)`        | Removes it and reports whether it existed.        |
| A user changes workspace | `clear()`           | Removes all indexed documents.                    |

IDs can be nonempty strings or finite numbers. Keep them stable: `1` and `"1"` are different IDs. Validation failures leave the batch unchanged. Documents are shallow snapshots; nested values outside indexed fields remain caller-owned. [Index contract](reference-core.md).

## Query semantics and ranking

**Relevance decides what appears first.** Searchivo finds matching tokens, assigns a score and returns the highest scores first. Matching a boosted product name can outweigh a match in its description.

| Search requirement                              | Choose                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| Short names and predictable field weights       | Default term-frequency ranking with field boosts.    |
| Articles or descriptions with different lengths | Optional `bm25()` ranking.                           |
| Understand an unexpected result                 | `explainSearch` to inspect real score contributions. |

Queries match any query token (OR). Case is normalized, repeated terms count once, and equal scores retain insertion order. Accents remain significant; stemming is not applied. BM25 here is a field-weighted variant, not BM25F. [Ranking options and parameters](reference-core.md).

## Fuzzy matching and highlights

**Help users recover from a typo.** A query such as `iphnoe` can find `iphone` with `createFuzzySearch(engine)`. Create the fuzzy helper once and reuse it; it refreshes its derived dictionary after index changes.

Fuzzy search supports one insertion, deletion, substitution or adjacent transposition. Its bounded work protects the UI, and `truncated` tells you when some corrections may have been omitted. Exact and corrected terms currently use the same ranking weight.

**Show why a result matched.** `highlight(text, query)` returns ranges into the original text. Render the matching ranges with text nodes and `<mark>` elements. Never insert document content as HTML. [Fuzzy limits and safe highlights](reference-core.md).

## Filters, facets, sorting and pagination

**Search finds candidates; refinements help people choose.** Apply `refine` to ranked results when your interface needs category filters, a price range, sort controls or pages.

| Control in your UI      | Searchivo concept                               |
| ----------------------- | ----------------------------------------------- |
| Brand checkbox          | Typed equality or membership filter.            |
| Minimum / maximum price | Inclusive numeric range.                        |
| Category counts         | Facets over filtered matches before pagination. |
| Price: low to high      | Stable scalar sorting.                          |
| Next page               | `offset` and `limit`; total remains available.  |

Filters combine with AND. Refinements run after ranking; they do not reduce ranking work. Facets are not disjunctive. [Refinement reference](reference-interaction.md) · [Try the catalog](https://searchivo-market.netlify.app/).

## Suggestions, debounce and state

**Keep the interface responsive as someone types.** Prefix suggestions help complete a word; debounce avoids starting work for every keystroke. Search state gives the template one place to read results, totals, loading and errors.

| Need                                          | Use                                               |
| --------------------------------------------- | ------------------------------------------------- |
| Complete a single-token prefix                | `createAutocomplete`.                             |
| Combine suggestion sources                    | `groupedSuggestions`.                             |
| Delay a request while typing                  | `createDebouncer`.                                |
| Keep old responses from replacing new results | `createSearchState`, used by the Angular binding. |

Previous results stay visible during loading. Render a loading indicator and an error message so people understand the current state. Cancellation protects request ordering even when a transport ignores abort. [Async recipes](recipes.md) · [State API](reference-interaction.md).

## Angular

**Connect your existing markup to reactive results.** Create a binding, provide it in your component, import `SearchivoInputDirective`, then read `binding.inject()` from a field initializer.

1. Add `searchivo` to your labeled native input.
2. Render `search.state().results` with Angular's `@for` and track each hit's ID.
3. Show `loading`, `error` and `total` from the same state.
4. Use the typed controller when filters or pagination change.

The integration supports OnPush and zoneless change detection. It commits IME composition at the right time and disposes the component's controller through `DestroyRef`. You keep control of HTML, CSS and accessibility. [Complete Angular component](angular.md) · [Angular API](reference-angular.md).

## Workers

### Advanced: keep expensive work off the UI thread

Measure your own dataset first. If indexing or ranking blocks interaction, the optional worker integration moves that work to a module Worker. It is an execution choice; the search experience still belongs to your Angular application.

Construct the engine inside the Worker and attach a guarded runtime. Connect the client, wait for readiness, and dispose resources you own. Abort abandons a reply; it does not interrupt synchronous CPU work. [Worker setup and ownership](reference-integrations.md).

## HTTP adapters

### Advanced: connect a search endpoint

Use the optional HTTP source when documents should stay on your server. It sends a typed request and validates responses before exposing them to the UI. The same state controller handles loading, errors and stale responses.

You own the backend, authentication and authorization. Searchivo does not provide a distributed search server. [HTTP recipe](recipes.md) · [Adapter contract](reference-integrations.md).

## Explanations and DevTools

### Advanced: inspect relevance during development

Use `explainSearch` to see which fields and terms contributed to a score. This helps you tune boosts against the queries your users actually enter. Regular queries do not allocate explanation records.

The optional recorder captures bounded local state summaries without sending documents or telemetry anywhere. [Diagnostics reference](reference-integrations.md).

## Themes and accessibility

**Make search feel native to your product.** Searchivo does not impose a component library. Keep your existing styles, or add optional scoped CSS from `@searchivo/themes/css`.

Always give the input a visible label. Announce results with a status region, keep keyboard focus predictable, and render highlights as text. An autocomplete popup needs its own complete keyboard and ARIA behavior. [Angular input guidance](angular.md#native-input-and-ime).

## Performance methodology

**Start small, measure with real queries, then tune.** The basic core consumer is measured at 1,248 gzip bytes. Seeded benchmarks cover 1,000, 10,000 and 100,000 documents and retain their environments and raw samples.

Those measurements help you understand costs, not predict your users' latency. Indexing, first-use fuzzy dictionary construction and transport overhead have different costs. [Performance guide](performance.md) · [Benchmark evidence](https://searchivo.netlify.app/benchmarks/).

## Migration and troubleshooting

Searchivo 0.1.0 is pre-1.0. Keep core and integration versions synchronized and review the [changelog](../CHANGELOG.md) when upgrading.

| What you see             | Check first                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| No results               | Searchable string fields, complete tokens and accents; empty queries intentionally return none. |
| Duplicate ID error       | Use `upsert` for replacements and unique IDs within each batch.                                 |
| Angular injection error  | Import the directive and provide the same binding in its component scope.                       |
| Unexpected order         | Inspect boosts and `explainSearch` before changing ranking.                                     |
| Slow first fuzzy query   | Reuse the helper; dictionary construction happens after mutations.                              |
| Remote response rejected | Compare the endpoint's response with the validated source contract.                             |

Read the [security and resource limits](security.md) before accepting untrusted data or queries.
