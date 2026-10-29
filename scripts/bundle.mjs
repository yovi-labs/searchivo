import { build } from "esbuild";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
const result = await build({
  stdin: {
    contents:
      'export { createSearchEngine } from "./packages/core/dist/index.js";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  minify: true,
  write: false,
  metafile: true,
});
const bytes = result.outputFiles[0].contents;
if (
  Object.keys(result.metafile.inputs).some((path) =>
    /bm25|fuzzy|highlight|refinements|source|state|suggestions|explain|devtools/.test(
      path,
    ),
  )
)
  throw new Error("Basic consumer must not bundle optional features");
const report = {
  raw: bytes.length,
  gzip: gzipSync(bytes).length,
  brotli: brotliCompressSync(bytes).length,
  inputs: Object.keys(result.metafile.inputs),
};
if (report.gzip > 5000)
  throw new Error("Basic core exceeds the initial 5KB gzip budget");
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/bundle.json", JSON.stringify(report, null, 2));
console.log(report);
const angular = await build({
  entryPoints: ["packages/angular/dist/fesm2022/searchivo-angular.mjs"],
  external: ["@angular/*", "@searchivo/*"],
  bundle: true,
  format: "esm",
  minify: true,
  write: false,
});
const angularBytes = angular.outputFiles[0].contents;
const angularReport = {
  raw: angularBytes.length,
  gzip: gzipSync(angularBytes).length,
  brotli: brotliCompressSync(angularBytes).length,
  scope:
    "Angular integration only; Angular framework and Searchivo core external",
};
writeFileSync(
  "artifacts/angular-bundle.json",
  JSON.stringify(angularReport, null, 2),
);
console.log(angularReport);
const optionalReports = {};
for (const entry of [
  "core/bm25",
  "core/fuzzy",
  "core/highlight",
  "core/refinements",
  "core/suggestions",
  "core/state",
  "core/explain",
  "workers/client",
  "workers/runtime",
  "workers/web",
  "adapters/index",
  "devtools/index",
]) {
  const [pkg, name] = entry.split("/");
  const output = await build({
    entryPoints: [`packages/${pkg}/dist/${name}.js`],
    bundle: true,
    format: "esm",
    minify: true,
    write: false,
  });
  const bytes = output.outputFiles[0].contents;
  optionalReports[entry] = {
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
    brotli: brotliCompressSync(bytes).length,
  };
}
writeFileSync(
  "artifacts/optional-bundles.json",
  JSON.stringify(
    {
      scope:
        "Independent entry bundles including their imported code; not additive application costs",
      entries: optionalReports,
    },
    null,
    2,
  ),
);
console.log("Measured 12 optional entry bundles (raw/gzip/Brotli)");
