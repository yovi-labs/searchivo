import { createSearchEngine } from "@searchivo/core";
import { products } from "./fixtures.js";
const input = document.querySelector<HTMLInputElement>("#home-query");
if (input) {
  const engine = createSearchEngine(
    { id: "id", fields: { name: { boost: 3 }, description: {} } },
    products,
  );
  const list = document.querySelector<HTMLUListElement>("#home-results")!;
  const status = document.querySelector<HTMLElement>("#home-status")!;
  const run = () => {
    const start = performance.now();
    const hits = engine.search(input.value);
    status.textContent = `${hits.length} results · ${(performance.now() - start).toFixed(2)} ms · 12 demo fixtures`;
    list.replaceChildren(
      ...hits.slice(0, 3).map((hit) => {
        const item = document.createElement("li"),
          title = document.createElement("strong"),
          detail = document.createElement("span"),
          score = document.createElement("code");
        title.textContent = hit.document.name;
        detail.textContent = hit.document.category;
        score.textContent = `score ${hit.score.toFixed(1)}`;
        item.append(title, detail, score);
        return item;
      }),
    );
    if (!hits.length) {
      const item = document.createElement("li");
      item.textContent = "No matches. Try phone, Apple or laptop.";
      list.append(item);
    }
  };
  input.addEventListener("input", run);
  run();
}
if (document.querySelector("#playground"))
  void import("@searchivo/playground").then((module) => {
    const dispose = module.mountPlayground(products);
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) dispose();
    });
  });
