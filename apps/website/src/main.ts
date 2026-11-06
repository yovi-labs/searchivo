import { createSearchEngine } from "@searchivo/core";
import { products } from "./fixtures.js";
// Preserve old public example bookmarks after moving the application to its own site.
if (
  location.pathname === "/" &&
  ["#catalog", "#features", "#minimal"].includes(location.hash)
)
  location.replace(`https://searchivo-market.netlify.app/${location.hash}`);
const docsSidebar = document.querySelector<HTMLElement>(".docs-sidebar");
const docsNavigation = docsSidebar?.querySelector<HTMLElement>(".docs-nav");
if (docsSidebar && docsNavigation) {
  docsNavigation.id = "docs-topics";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "docs-menu-toggle";
  toggle.textContent = "Browse documentation";
  toggle.setAttribute("aria-controls", "docs-topics");
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => {
    const expanded = docsSidebar.classList.toggle("is-expanded");
    toggle.setAttribute("aria-expanded", String(expanded));
  });
  docsNavigation.before(toggle);
  docsSidebar.classList.add("has-docs-menu");
}
const docsSearch = document.querySelector<HTMLInputElement>("#docs-search");
if (docsSearch) {
  const sections = [
    ...document.querySelectorAll<HTMLElement>("[data-doc-section]"),
  ];
  const links = [
    ...document.querySelectorAll<HTMLAnchorElement>(".docs-nav a"),
  ];
  const filter = () => {
    const query = docsSearch.value.trim().toLocaleLowerCase();
    let count = 0;
    sections.forEach((section, index) => {
      const matches = (
        section.dataset["searchText"] ??
        section.textContent ??
        ""
      )
        .toLocaleLowerCase()
        .includes(query);
      section.hidden = !matches;
      const link = links[index];
      if (link) link.hidden = !matches;
      if (matches) count++;
    });
    document.querySelector("#docs-search-status")!.textContent =
      `${count} ${count === 1 ? "topic" : "topics"}${query ? " matching your search" : ""}`;
    document.querySelector<HTMLElement>("#docs-empty")!.hidden = count !== 0;
  };
  docsSearch.addEventListener("input", filter);
  filter();
  document
    .querySelectorAll<HTMLAnchorElement>('.learning-paths a[href^="#"]')
    .forEach((link) =>
      link.addEventListener("click", () => {
        docsSearch.value = "";
        filter();
      }),
    );
}
document
  .querySelectorAll<HTMLElement>(".guide-content table")
  .forEach((table) => {
    // Tables can overflow at different widths across platforms and font metrics.
    table.tabIndex = 0;
    let heading = table.previousElementSibling;
    while (heading && !heading.matches("h2[id], h3[id]"))
      heading = heading.previousElementSibling;
    if (heading) table.setAttribute("aria-labelledby", heading.id);
  });

document.querySelectorAll<HTMLElement>("article pre").forEach((pre) => {
  pre.tabIndex = 0;
  pre.setAttribute("aria-label", "Code example");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-doc-code";
  button.textContent = "Copy code";
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent ?? "");
      button.textContent = "Copied";
    } catch {
      button.textContent = "Select code to copy";
    }
  });
  const panel = document.createElement("div");
  panel.className = "code-example";
  const toolbar = document.createElement("div");
  toolbar.className = "code-toolbar";
  const language = document.createElement("span");
  language.textContent =
    pre.querySelector("code")?.className.replace("language-", "") || "Example";
  pre.before(panel);
  toolbar.append(language, button);
  panel.append(toolbar, pre);
});
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
  void import("@searchivo/playground")
    .then((module) => {
      const dispose = module.mountPlayground(products);
      window.addEventListener("pagehide", (event) => {
        if (!event.persisted) dispose();
      });
    })
    .catch(() => {
      document.querySelector("#search-status")!.textContent =
        "Playground could not load. Reload to try again.";
    });
