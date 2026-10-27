import { createSearchEngine } from "@searchivo/core";
type Product = { id: number; name: string; description: string };
const search = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: { boost: 1 } },
});
search.add([
  { id: 1, name: "Apple iPhone 15 Pro", description: "Premium smartphone" },
]);
const results = search.search("iphone");
if (results[0]?.id !== 1)
  throw new Error("Example did not find the indexed product");
// @ts-expect-error Numeric fields are not searchable text.
createSearchEngine<Product>({ id: "id", fields: { id: {} } });
