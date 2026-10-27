import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
type Product = { id: number; name: string; description: string };
const search = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: { boost: 1 } },
});
search.add([
  { id: 1, name: "Apple iPhone 15 Pro", description: "Premium smartphone" },
]);
const results = search.search("iphone");
const ranked = createSearchEngine<Product>({
  id: "id",
  fields: { name: {} },
  ranking: bm25(),
});
ranked.add([{ id: 2, name: "phone", description: "" }]);
if (!(ranked.search("phone")[0]!.score > 0))
  throw new Error("BM25 example failed");
if (results[0]?.id !== 1)
  throw new Error("Example did not find the indexed product");
// @ts-expect-error Numeric fields are not searchable text.
createSearchEngine<Product>({ id: "id", fields: { id: {} } });
