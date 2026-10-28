import { Worker } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { cpus, platform } from "node:os";
import { mkdirSync, writeFileSync } from "node:fs";
import { createWorkerClient } from "../packages/workers/dist/client.js";
const isDocument = (value) =>
  typeof value === "object" &&
  value !== null &&
  typeof value.id === "number" &&
  typeof value.text === "string";
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"]).toString().trim(),
  dirty: Boolean(
    execFileSync("git", ["status", "--porcelain"]).toString().trim(),
  ),
  node: process.version,
  platform: platform(),
  cpu: cpus()[0].model,
  warmups: 10,
  samples: 30,
  workloads: [],
};
for (const size of [1000, 10000, 100000]) {
  const start = performance.now();
  const worker = new Worker(new URL("./worker-runtime.mjs", import.meta.url));
  const transport = {
    send: (message) => worker.postMessage(message),
    onMessage(listener) {
      const handler = (value) => {
        if ("version" in value) listener(value);
      };
      worker.on("message", handler);
      return () => worker.off("message", handler);
    },
    onError(listener) {
      worker.on("error", listener);
      return () => worker.off("error", listener);
    },
    terminate: () => {
      void worker.terminate();
    },
  };
  const client = createWorkerClient(transport, isDocument, true);
  try {
    await client.request("ready", null);
    const startupMs = performance.now() - start;
    const docs = Array.from({ length: size }, (_, id) => ({
      id,
      text: `product category${id % 100} unique${id}`,
    }));
    const cloneStart = performance.now();
    structuredClone(docs);
    const cloneMs = performance.now() - cloneStart;
    const indexStart = performance.now();
    await client.request("add", docs);
    const indexingAcknowledgmentMs = performance.now() - indexStart;
    const heap = new Promise((resolve) => {
      const listener = (value) => {
        if ("heap" in value) {
          worker.off("message", listener);
          resolve(value.heap);
        }
      };
      worker.on("message", listener);
    });
    worker.postMessage("heap");
    const workerHeapSampleBytes = await heap;
    for (let i = 0; i < 10; i++) await client.request("search", "category17");
    const queryRoundTripMs = [];
    for (let i = 0; i < 30; i++) {
      const t = performance.now();
      await client.request("search", "category17");
      queryRoundTripMs.push(performance.now() - t);
    }
    const suggestionStart = performance.now();
    await client.request("suggest", { query: "cat", limit: 10 });
    const suggestionRoundTripMs = performance.now() - suggestionStart;
    report.workloads.push({
      size,
      startupMs,
      cloneMs,
      indexingAcknowledgmentMs,
      queryRoundTripMs,
      suggestionRoundTripMs,
      workerHeapSampleBytes,
      memoryCaveat:
        "Worker JS heap sample without forced GC; includes runtime. Not retained peak, RSS or isolated process memory.",
    });
  } finally {
    client.dispose();
  }
}
mkdirSync("benchmarks/reports", { recursive: true });
const path = `benchmarks/reports/workers-${new Date().toISOString().replaceAll(":", "-")}.json`;
writeFileSync(path, JSON.stringify(report, null, 2));
console.log(path);
