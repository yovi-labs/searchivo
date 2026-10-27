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
    /bm25|fuzzy|highlight|refinements|source|state|suggestions/.test(path),
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
