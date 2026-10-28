import { build } from "esbuild";
await build({
  entryPoints: {
    "search-worker": "examples/browser-worker.ts",
    "worker-demo": "examples/browser-worker-client.ts",
  },
  bundle: true,
  format: "esm",
  outdir: "dist/angular-example/browser",
});
