import { build } from "esbuild";
await build({
  entryPoints: {
    "search-worker": "examples/browser-worker.ts",
    "worker-demo": "examples/browser-worker-client.ts",
    "feature-worker": "apps/angular-example/src/feature-worker.ts",
  },
  bundle: true,
  format: "esm",
  outdir: "dist/angular-example/browser",
});
await build({
  entryPoints: ["apps/angular-example/src/feature-server.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/angular-example/feature-server.mjs",
});
