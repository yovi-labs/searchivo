# Tutorial: build your first search

Use this tutorial for a small typed local index. Continue with the [Angular recipe](angular.md) when you need a native input and reactive results. The [live Angular demo](https://searchivo.netlify.app/), [catalog](https://searchivo.netlify.app/#catalog) and [feature lab](https://searchivo.netlify.app/#features) use the same packages. Every catalog product, price, rating, illustration and stock value is fictional.

## Install the workspace

Searchivo `0.1.0-rebuild.0` packages are private and **not published on npm**. Clone [the repository](https://github.com/yovi-labs/searchivo/tree/develop), use Node 24.22.1 and pnpm 11.28.9, and run:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm build:deploy
node scripts/serve.mjs dist/deploy 4173
```

The preview now serves the Angular app at port 4173, docs at `/docs/`, and the fixture HTTP endpoints at `/api/search` and `/api/invalid`. This is a production-output preview: rebuild after source edits. For another repository, install the six validated private candidate tarballs you actually need, using their absolute paths with `pnpm add /path/to/searchivo-core-0.1.0-rebuild.0.tgz`. Keep matching package versions; do not run a public registry install for these names. Angular requires its tested peer versions; see the [reference](reference-angular.md).

## Index, query and update

This complete example uses exact token retrieval, deterministic ranking and safe document replacement. It compiles and runs against the packed package during validation.

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

## Next steps

- Read [indexing and query concepts](guide.md#indexing-and-ownership) before loading untrusted or mutable data.
- Add [BM25, typo recovery and highlights](reference-core.md) when ranking needs them.
- Add [refinements and suggestions](reference-interaction.md) to build the browsing experience.
- Follow [async and HTTP recipes](recipes.md) for debouncing, cancellation and error states.
- Browse the [complete API inventory](public-api.md) for every supported entry point.
