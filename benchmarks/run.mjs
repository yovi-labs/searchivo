import { createSearchEngine } from "../packages/core/dist/index.js";
import { bm25 } from "../packages/core/dist/bm25.js";
import { createFuzzySearch } from "../packages/core/dist/fuzzy.js";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { cpus, platform, release } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: Boolean(
    execFileSync("git", ["status", "--porcelain"]).toString().trim(),
  ),
  node: process.version,
  platform: `${platform()} ${release()}`,
  cpu: cpus()[0].model,
  seed: 17,
  warmups: 10,
  samples: 30,
  workloads: [],
};
for (const size of [1000, 10000, 100000])
  for (const cardinality of ["repeated", "high"]) {
    let seed = 17;
    const docs = Array.from({ length: size }, (_, id) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return {
        id,
        name: `product category${seed % 100} ${cardinality === "high" ? `unique${id}` : "common"}`,
      };
    });
    global.gc();
    const before = process.memoryUsage().heapUsed;
    const start = performance.now();
    const engine = createSearchEngine({ id: "id", fields: { name: {} } });
    const initialized = performance.now();
    engine.add(docs);
    const indexed = performance.now();
    const transient = process.memoryUsage().heapUsed - before;
    global.gc();
    const retained = process.memoryUsage().heapUsed - before;
    const query = "category17";
    for (let i = 0; i < report.warmups; i++) engine.search(query);
    const queries = Array.from({ length: report.samples }, () => {
      const t = performance.now();
      engine.search(query);
      return performance.now() - t;
    });
    const t = performance.now();
    engine.upsert([{ id: 0, name: "product changed" }]);
    const incremental = performance.now() - t;
    const fuzzy = createFuzzySearch(engine);
    global.gc();
    const fuzzyBefore = process.memoryUsage().heapUsed;
    const coldStart = performance.now();
    fuzzy("cateogry17");
    const fuzzyCold = performance.now() - coldStart;
    global.gc();
    const fuzzyRetained = process.memoryUsage().heapUsed - fuzzyBefore;
    for (let i = 0; i < report.warmups; i++) fuzzy("cateogry17");
    const fuzzyWarm = Array.from({ length: report.samples }, () => {
      const t = performance.now();
      fuzzy("cateogry17");
      return performance.now() - t;
    });
    const ranked = createSearchEngine(
      { id: "id", fields: { name: {} }, ranking: bm25() },
      docs,
    );
    for (let i = 0; i < report.warmups; i++) ranked.search(query);
    const bm25Queries = Array.from({ length: report.samples }, () => {
      const t = performance.now();
      ranked.search(query);
      return performance.now() - t;
    });
    report.workloads.push({
      size,
      cardinality,
      initializationMs: initialized - start,
      indexingMs: indexed - initialized,
      incrementalMs: incremental,
      queryMs: queries,
      bm25QueryMs: bm25Queries,
      fuzzyColdMs: fuzzyCold,
      fuzzyWarmMs: fuzzyWarm,
      fuzzyRetainedHeapBytes: fuzzyRetained,
      retainedHeapBytes: retained,
      postIndexHeapDeltaBytes: transient,
      memoryCaveat:
        "Post-index heap delta is a sample, not transient peak; GC-dependent and excludes fixture allocation.",
      stats: engine.stats(),
    });
  }
mkdirSync("benchmarks/reports", { recursive: true });
const path = `benchmarks/reports/${new Date().toISOString().replaceAll(":", "-")}.json`;
writeFileSync(path, JSON.stringify(report, null, 2));
console.log(`Wrote ${path}`);
