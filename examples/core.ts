import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { createFuzzySearch } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
import { refine } from "@searchivo/core/refinements";
import { createAutocomplete } from "@searchivo/core/suggestions";
import { localSource } from "@searchivo/core/source";
import { createSearchState } from "@searchivo/core/state";
type Product = { id: number; name: string; description: string };
const search = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: { boost: 1 } },
});
search.add([
  { id: 1, name: "Apple iPhone 15 Pro", description: "Premium smartphone" },
]);
const results = search.search("iphone");
if (createAutocomplete(search)("iph")[0] !== "iphone")
  throw new Error("Suggestions example failed");
const state = createSearchState(localSource(search));
await state.search({ query: "iphone" });
if (state.get().total !== 1) throw new Error("State example failed");
state.dispose();
if (
  refine(results, {
    filters: [{ field: "id", op: "range", min: 1 }],
    facets: ["name"],
    limit: 1,
  }).total !== 1
)
  throw new Error("Refinements example failed");
export function verifyTypes() {
  // @ts-expect-error String fields cannot use numeric range filters.
  refine(results, { filters: [{ field: "name", op: "range", min: 0 }] });
  // @ts-expect-error Equality values must match their field type.
  refine(results, { filters: [{ field: "id", op: "eq", value: "wrong" }] });
}
if (createFuzzySearch(search)("iphnoe").results[0]?.id !== 1)
  throw new Error("Fuzzy example failed");
if (highlight("😀 iPhone", "iphone")[0]?.start !== 3)
  throw new Error("Highlight example failed");
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
