# Install Searchivo in your Angular app

Turn a list of products, articles or records into ranked search results. Install the packages in your existing Angular application, describe the fields people search, and connect the results to your own interface.

## 1. Install with npm

From your Angular application's directory, install both packages at the same version:

```sh
npm install @searchivo/core@0.1.0 @searchivo/angular@0.1.0
```

> **Release availability:** version 0.1.0 is awaiting npm publication. This command becomes available when the release is published.

The Angular integration supports the tested Angular **22.2.3** environment. Check the [Angular compatibility reference](reference-angular.md) before installing. You do not need the Searchivo repository, its build tools or a hosted search service to use the library.

## 2. Define what people can search

An **index** is the searchable view of your data. Give each document a stable ID and choose its searchable string fields. A field boost makes a match in that field contribute more to the result's score: a product name can matter more than its description.

## 3. Index, query and update

This complete example indexes two products. Searching `desk` ranks the desk lamp first because the match appears in its boosted name. The same engine stays alive as products change.

```ts
import { createSearchEngine, tokenize } from "@searchivo/core";

type Product = { id: string; name: string; description: string; price: number };
const engine = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: {} },
});
engine.add([
  {
    id: "lamp",
    name: "Desk lamp",
    description: "Adjustable office light",
    price: 49,
  },
  {
    id: "chair",
    name: "Office chair",
    description: "A chair for your desk",
    price: 129,
  },
]);
const hits = engine.search("desk");
if (hits[0]?.id !== "lamp")
  throw new Error("Name boost should rank the lamp first");
if (tokenize("ＤＥＳＫ!").join() !== "desk")
  throw new Error("Normalization failed");
engine.upsert([
  {
    id: "lamp",
    name: "Desk lamp",
    description: "Dimmable office light",
    price: 59,
  },
]);
if (!engine.remove("chair")) throw new Error("Expected an existing document");
const statistics = engine.stats();
const revision = engine.version();
const dictionary = [...engine.vocabulary()];
engine.clear();
export { hits, statistics, revision, dictionary };
```

`search()` returns all ranked hits; it does not paginate. Empty queries return no hits. To build catalog browsing, explicitly supply your application's product list when the query is empty, then use `refine`. The [10,000-product source](https://github.com/yovi-labs/searchivo/blob/develop/apps/angular-example/src/catalog.ts) demonstrates this policy, fuzzy fallback, 24-item pages, typed filters and Signals.

## 4. Connect your Angular interface

Use [the complete standalone component](angular.md) to connect this engine to a labeled native input, reactive results and loading/error states. The binding manages the component's search state and cleans it up when Angular destroys the component.

Try the result in [Searchivo Market](https://searchivo-market.netlify.app/): search, narrow by category or price, open product details and save favorites. Its demonstration products and prices are fictional.

## Next steps

- Read [indexing and query concepts](guide.md#indexing-and-ownership) before loading untrusted or mutable data.
- Add [BM25, typo recovery and highlights](reference-core.md) when ranking needs them.
- Add [refinements and suggestions](reference-interaction.md) to build the browsing experience.
- Follow [async and HTTP recipes](recipes.md) for debouncing, cancellation and error states.
- Browse the [complete API inventory](public-api.md) for every supported entry point.
