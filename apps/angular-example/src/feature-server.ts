import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { products, type Product } from "./features-data.js";
const engine = createSearchEngine<Product>(
  { id: "id", fields: { name: { boost: 3 }, text: {} }, ranking: bm25() },
  products,
);
export function fixtureSearch(query: string) {
  const results = engine.search(query);
  return { results, total: results.length, facets: {} };
}
