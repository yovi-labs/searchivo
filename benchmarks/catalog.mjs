import { generateCatalog } from "../apps/angular-example/src/catalog-data.ts";
import { createSearchEngine } from "../packages/core/dist/index.js";
import { bm25 } from "../packages/core/dist/bm25.js";
import { createFuzzySearch } from "../packages/core/dist/fuzzy.js";
import { refine } from "../packages/core/dist/refinements.js";
import { highlight } from "../packages/core/dist/highlight.js";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { cpus } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";

const products = generateCatalog();
const samples = (run) => {
  for (let i = 0; i < 10; i++) run();
  return Array.from({ length: 30 }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  });
};
global.gc();
const before = process.memoryUsage().heapUsed;
const start = performance.now();
const engine = createSearchEngine(
  {
    id: "id",
    fields: {
      name: { boost: 4 },
      brand: { boost: 2 },
      id: { boost: 5 },
      description: {},
      category: {},
      color: {},
    },
    ranking: bm25(),
  },
  products,
);
const indexingMs = performance.now() - start;
global.gc();
const retainedHeapBytes = process.memoryUsage().heapUsed - before;
const fuzzy = createFuzzySearch(engine);
const cold = performance.now();
fuzzy("headphnoes");
const fuzzyColdMs = performance.now() - cold;
const hits = engine.search("wireless headphones");
const page = products.slice(0, 24);
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: Boolean(
    execFileSync("git", ["status", "--porcelain"]).toString().trim(),
  ),
  node: process.version,
  cpu: cpus()[0].model,
  size: products.length,
  warmups: 10,
  samples: 30,
  indexingMs,
  retainedHeapBytes,
  fuzzyColdMs,
  exactMs: samples(() => engine.search("wireless headphones")),
  fuzzyWarmMs: samples(() => fuzzy("headphnoes")),
  refinementMs: samples(() =>
    refine(hits, {
      filters: [{ field: "inStock", op: "eq", value: true }],
      facets: ["category"],
      sort: { field: "price", direction: "asc" },
      limit: 24,
    }),
  ),
  emptyHighlightPageMs: samples(() =>
    page.forEach((product) => highlight(product.name, "")),
  ),
  highlightPageMs: samples(() =>
    page.forEach((product) => highlight(product.name, "wireless headphones")),
  ),
  caveat:
    "Synthetic catalog; Node timings exclude Angular rendering. Heap is retained after GC, excludes fixtures, and is not a peak. Indexing/cold costs are single samples.",
};
mkdirSync("benchmarks/reports", { recursive: true });
const path = `benchmarks/reports/catalog-${process.argv[2] ?? "run"}.json`;
writeFileSync(path, JSON.stringify(report, null, 2) + "\n");
console.log(`Wrote ${path}`);
