import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { attachWorkerRuntime } from "@searchivo/workers/runtime";
import { webTransport } from "@searchivo/workers/web";
import { isProduct } from "./model.js";
import type { Product } from "./model.js";
const options = new URL(self.location.href).searchParams;
const engine = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: Number(options.get("boost")) }, description: {} },
  ...(options.get("ranking") === "bm25"
    ? {
        ranking: bm25({
          k1: Number(options.get("k1")),
          b: Number(options.get("b")),
        }),
      }
    : {}),
});
attachWorkerRuntime(webTransport(self), engine, isProduct);
