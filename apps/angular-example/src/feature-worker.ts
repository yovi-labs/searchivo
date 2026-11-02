import { createSearchEngine } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { attachWorkerRuntime } from "@searchivo/workers/runtime";
import { webTransport } from "@searchivo/workers/web";
import { products, isProduct, type Product } from "./features-data.js";
attachWorkerRuntime(
  webTransport(self),
  createSearchEngine<Product>(
    { id: "id", fields: { name: { boost: 3 }, text: {} }, ranking: bm25() },
    products,
  ),
  isProduct,
);
