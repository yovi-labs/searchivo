import { playgroundPage } from "./site-playground.mjs";
import { documentation, renderDocumentation, publicApi } from "./site-docs.mjs";
import { build } from "esbuild";
import { marked } from "marked";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
const out = "dist/website";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const nav = [
  ["Home", "/"],
  ["Docs", "/docs/"],
  ["Playground", "/playground/"],
  ["Examples", "/examples/"],
  ["Benchmarks", "/benchmarks/"],
  ["API", "/api/"],
];
function shell(title, path, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Searchivo. Fast search. Simple API. A modular TypeScript search toolkit."><title>${escape(title)} · Searchivo</title><link rel="canonical" href="https://searchivo.netlify.app${path}"><link rel="stylesheet" href="/site.css"></head><body class="searchivo-theme"><a class="skip" href="#main">Skip to content</a><header><div class="shell navigation"><a class="brand" href="/" aria-label="Searchivo home"><span class="brand-icon" aria-hidden="true">[ / ]</span> SEARCHIVO</a><nav aria-label="Main navigation">${nav.map(([label, url]) => `<a href="${url}" ${url === path ? 'aria-current="page"' : ""}>${label}</a>`).join("")}<a class="github" href="https://github.com/yovi-labs/searchivo">GitHub ↗</a></nav></div></header><main id="main" class="shell">${content}</main><footer><div class="shell"><span>SEARCHIVO — Fast search. Simple API.</span><span>0.1.0 · Prepared for npm publication · <a href="https://github.com/yovi-labs/searchivo/tree/develop">View source</a></span></div></footer><script type="module" src="/site.js"></script></body></html>`;
}
const pageTitle = (eyebrow, title, description) =>
  `<div class="page-title"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="lede">${description}</p></div>`;
const home = `<section class="hero"><div class="eyebrow">TypeScript-first. Framework independent.</div><h1>SEARCH<br><span>AT SPEED.</span></h1><p class="lede">Fast search. Simple API.<br>A modular toolkit for turning your data into answers.<br>Start with a few lines. Keep control of everything.</p><div class="actions"><a class="button primary" href="/docs/">Start building <span aria-hidden="true">&nbsp;↗</span></a><a class="button" href="/playground/">Explore the playground</a></div><span class="minor">ZERO CORE DEPENDENCIES &nbsp; / &nbsp; TYPED BY DEFAULT &nbsp; / &nbsp; OPEN SOURCE</span></section><section aria-label="Live search and code" class="demo"><div class="demo-live"><div class="demo-top">01 — Try real search</div><div class="demo-content"><label for="home-query">Search demo products</label><input id="home-query" value="phone" type="search" autocomplete="off"><p id="home-status" class="minor" role="status"></p><ul id="home-results" class="result-list"></ul></div></div><div><div class="demo-top">02 — That’s the API <span class="pill">TypeScript</span></div><div class="demo-content"><pre><code><span class="code-accent">import</span> { createSearchEngine }
  <span class="code-accent">from</span> '@searchivo/core';

const search = createSearchEngine&lt;Product&gt;({
  id: 'id',
  fields: {
    name: { boost: 3 },
    description: {},
  },
});

search.add(products);
const results = search.search('phone');

<span class="code-note">// Your documents. Deterministic results.</span></code></pre></div></div></section><section class="section"><div class="section-heading"><h2>Small core. Room to grow.</h2><span class="minor">IMPORT ONLY WHAT YOU NEED</span></div><div class="features"><div class="feature"><span class="number">01 / THE ENGINE</span><h3>Make relevance yours.</h3><p>Inverted indexing, field boosts, optional BM25 and bounded fuzzy matching. Understand every score.</p></div><div class="feature"><span class="number">02 / THE INTEGRATIONS</span><h3>Bring your own interface.</h3><p>Angular Signals and native inputs. Optional workers and HTTP sources. Your markup stays yours.</p></div><div class="feature"><span class="number">03 / THE EVIDENCE</span><h3>Measure what matters.</h3><p>Behavioral tests, packed consumers and reproducible benchmark samples. Clear scope, honest limitations.</p></div></div></section>`;
const officialHome =
  home +
  '<section class="section"><div class="section-heading"><h2>A real application, built with Searchivo.</h2></div><p class="lede">Explore 10,000 fictional products, refine your search, inspect product details and save your favorites in Searchivo Market.</p><div class="actions"><a class="button primary" href="https://searchivo-market.netlify.app/">Open Searchivo Market ↗</a><a class="button" href="https://github.com/yovi-labs/searchivo/tree/develop/apps/angular-example/src">Read the application source</a></div><p>The application is a separate Angular project. All demonstration products and prices are fictional.</p></section>';
const playground = playgroundPage(pageTitle);
const guide = readFileSync("docs/guide.md", "utf8");
const docsNav = [
  "Getting started",
  "Indexing and ownership",
  "Query semantics and ranking",
  "Fuzzy matching and highlights",
  "Filters, facets, sorting and pagination",
  "Suggestions, debounce and state",
  "Angular",
  "Workers",
  "HTTP adapters",
  "Explanations and DevTools",
  "Themes and accessibility",
  "Performance methodology",
  "Migration and troubleshooting",
];
const slug = (text) =>
  text
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]/g, "")
    .replaceAll(" ", "-");
let renderedGuide = marked.parse(guide.replace(/^# .*\r?\n/, ""));
for (const heading of docsNav)
  renderedGuide = renderedGuide.replace(
    `<h2>${heading}</h2>`,
    `<h2 id="${slug(heading)}">${heading}</h2>`,
  );
const sections = renderedGuide.split(/(?=<h2 id=)/);
const docs = `${pageTitle("Documentation / v0.1.0", "Build search with confidence.", "Start with a working query. Add relevance, interaction and integrations when your application needs them.")}<div class="learning-paths"><a href="#getting-started"><span>01 / START HERE</span><strong>Your first search</strong><small>Index → query → ranked results</small></a><a href="#angular"><span>02 / INTEGRATE</span><strong>Bring your interface</strong><small>Angular, workers and HTTP sources</small></a><a href="/playground/"><span>03 / EXPERIMENT</span><strong>Tune in the playground</strong><small>Explore the actual package behavior ↗</small></a></div><div class="docs-grid"><aside class="docs-sidebar" aria-label="Documentation navigation"><label for="docs-search">Find in the guide</label><input id="docs-search" type="search" placeholder="Try cancellation or fuzzy…" aria-describedby="docs-search-status"><p id="docs-search-status" class="control-help" role="status">${docsNav.length} topics</p><nav class="docs-nav" aria-label="Documentation sections">${docsNav.map((title) => `<a href="#${slug(title)}">${title}</a>`).join("")}</nav><a class="source-link" href="https://github.com/yovi-labs/searchivo/blob/develop/docs/guide.md">Edit this guide on GitHub ↗</a></aside><article class="guide-content">${sections.map((section, i) => (i === 0 ? section : `<section data-doc-section>${section}</section>`)).join("")}<p id="docs-empty" hidden>No matching topics. Try “ranking”, “worker”, or “state”.</p></article></div>`;
const examples = `${pageTitle("Examples", "Start from something real.", "Runnable consumers, validated against the packages they demonstrate.")}<article><h2>Local TypeScript engine</h2><p>The packed-package example exercises indexing, BM25, fuzzy matching, highlights, refinements, suggestions, state and explanations.</p><a class="button" href="https://github.com/yovi-labs/searchivo/blob/develop/examples/core.ts">View TypeScript example ↗</a><h2>Standalone Angular</h2><p>Native input enhancement with scoped providers, Signals, OnPush and zoneless change detection. Labels and markup stay in the application.</p><a class="button" href="https://github.com/yovi-labs/searchivo/tree/develop/apps/angular-example">View Angular example ↗</a><h2>Worker execution</h2><p>Construct the engine inside a module Worker. Validate the protocol and document shape, acknowledge readiness and dispose owned resources.</p><a class="button" href="https://github.com/yovi-labs/searchivo/blob/develop/examples/browser-worker-client.ts">View worker client ↗</a><h2>Interactive controls</h2><p>The playground demonstrates keyboard suggestions, safe range rendering, filters and local/worker ranking. It clearly labels its small synthetic fixtures.</p><a class="button primary" href="/playground/">Open playground</a></article>`;
const reportNames = readdirSync("benchmarks/reports")
  .filter((name) => /^20.*\.json$/.test(name))
  .sort();
const latest = reportNames.at(-1);
const report = JSON.parse(
  readFileSync(join("benchmarks/reports", latest), "utf8"),
);
const percentile = (samples) =>
  [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];
mkdirSync(join(out, "reports"), { recursive: true });
for (const name of readdirSync("benchmarks/reports"))
  copyFileSync(join("benchmarks/reports", name), join(out, "reports", name));
const benchmarks = `${pageTitle("Benchmarks", "Evidence, not promises.", "Seeded synthetic workloads. Recorded environments. Raw samples you can inspect.")}<article><p class="benchmark-note">The homepage’s 12 products are a behavior demo. These measurements use 1,000, 10,000 and 100,000 documents. Results are specific to the recorded machine and workload.</p><h2>Latest recorded engine run</h2><p>Node ${escape(report.node)} · ${escape(report.cpu)} · revision <code>${escape(report.revision.slice(0, 8))}</code> · dirty: ${report.dirty}</p><div style="overflow-x:auto"><table><thead><tr><th>Documents</th><th>Dictionary</th><th>Index (ms)</th><th>Query p95 (ms)</th><th>Fuzzy cold (ms)</th></tr></thead><tbody>${report.workloads.map((w) => `<tr><td>${w.size.toLocaleString("en-US")}</td><td>${w.cardinality}</td><td>${w.indexingMs.toFixed(2)}</td><td>${percentile(w.queryMs).toFixed(3)}</td><td>${w.fuzzyColdMs?.toFixed(2) ?? "Not measured"}</td></tr>`).join("")}</tbody></table></div><p>Ten warmups and thirty query samples. Index and cold costs are single samples. Retained heap follows GC; post-index samples are not peaks. Timing regression comparisons require comparable environments.</p><h2>Raw reports</h2><ul>${readdirSync(
  "benchmarks/reports",
)
  .map((name) => `<li><a href="/reports/${name}">${name}</a></li>`)
  .join(
    "",
  )}</ul><h2>What is measured</h2><p>Initialization, full/incremental indexing, exact and BM25 query latency, fuzzy/suggestion cold and warm costs, refinement work and heap deltas. Separate worker reports record startup, clone, acknowledgment, round trips and worker heap samples.</p><p>Run <code>pnpm benchmark</code> or <code>pnpm benchmark:workers</code>. No historical results are reused. Lighthouse is not a field Core Web Vitals measurement.</p></article>`;
const apiEntries = publicApi();
const inventory = readFileSync("docs/public-api.md", "utf8");
for (const entry of apiEntries)
  for (const symbol of entry.exports)
    if (
      !inventory.includes("`" + symbol + "`") &&
      !inventory.includes("`" + symbol + "<")
    )
      throw new Error(`Undocumented public export ${entry.entry}: ${symbol}`);
const api = `${pageTitle("API reference", "Every public entry point.", "Export names and declarations generated from all built package manifests, including integration types.")}<article>${apiEntries.map((entry) => `<h2>${escape(entry.entry)}</h2><p>Exports: ${escape(entry.exports.join(", ") || "style asset")}</p><pre><code>${escape(entry.text)}</code></pre>`).join("")}</article>`;
const documentationNav = documentation
  .map(
    (page) =>
      `<a href="${page.url}"><small>${page.group}</small> ${escape(page.title)}</a>`,
  )
  .join("");
const documentationIndex = `<section aria-label="Documentation library"><h2>Tutorials, concepts, recipes and reference</h2><div class="docs-library">${documentationNav}</div></section>`;
const searchablePages = documentation.filter((page) => page.id !== "guide");
const expandedDocs = docs
  .replace(
    '<div class="docs-grid">',
    `${documentationIndex}<div class="docs-grid">`,
  )
  .replace(
    '</nav><a class="source-link"',
    `${searchablePages.map((page) => `<a href="#topic-${page.id}">${escape(page.title)}</a>`).join("")}</nav><a class="source-link"`,
  )
  .replace(
    '<p id="docs-empty"',
    `${searchablePages.map((page) => `<section data-doc-section data-search-text="${escape(page.text)}"><h2 id="topic-${page.id}">${escape(page.title)}</h2><p>${page.group} · <a href="${page.url}">Read ${escape(page.title)}</a></p></section>`).join("")}<p id="docs-empty"`,
  );
const liveExamples = `<section aria-label="Live Angular examples"><h2>Live Angular demo</h2><p><a class="button primary" href="https://searchivo-market.netlify.app/#minimal">Minimal Angular integration</a> <a class="button" href="https://searchivo-market.netlify.app/">10,000-product catalog</a> <a class="button" href="https://searchivo-market.netlify.app/#features">Feature lab</a></p><p>Deterministic fictional products. Searchivo performs actual retrieval and refinements; worker and HTTP modes exercise real transports.</p><a href="https://github.com/yovi-labs/searchivo/tree/develop/apps/angular-example/src">Browse example source</a></section>`;
for (const [path, title, content] of [
  ["/", "Home", officialHome],
  ["/docs/", "Docs", expandedDocs],
  ["/playground/", "Playground", playground],
  ["/examples/", "Examples", liveExamples + examples],
  ["/benchmarks/", "Benchmarks", benchmarks],
  ["/api/", "API", api],
  ...documentation.map((page) => [
    page.url,
    page.title,
    `${pageTitle(page.group, escape(page.title), "Searchivo developer documentation")}<div class="docs-grid"><aside class="docs-sidebar"><a href="/docs/">Search all documentation</a><nav class="docs-nav" aria-label="Documentation library">${documentationNav}</nav><a class="source-link" href="https://github.com/yovi-labs/searchivo/blob/develop/docs/${page.id}.md">View source</a></aside><article class="guide-content">${renderDocumentation(page.text)}</article></div>`,
  ]),
]) {
  const directory = join(out, path);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "index.html"), shell(title, path, content));
}
const result = await build({
  entryPoints: { site: "apps/website/src/main.ts" },
  bundle: true,
  splitting: true,
  format: "esm",
  minify: true,
  outdir: out,
  metafile: true,
});
await build({
  entryPoints: { site: "apps/website/src/style.css" },
  bundle: true,
  minify: true,
  outdir: out,
});
await build({
  entryPoints: { "playground-worker": "apps/playground/src/worker.ts" },
  bundle: true,
  format: "esm",
  minify: true,
  outdir: out,
});
mkdirSync("artifacts", { recursive: true });
writeFileSync(
  "artifacts/website-metafile.json",
  JSON.stringify(result.metafile, null, 2),
);
console.log(
  "Built searchable documentation, complete public API and static website pages, lazy real-package playground and module worker.",
);

writeFileSync(
  join(out, "robots.txt"),
  "User-agent: *\nAllow: /\nSitemap: https://searchivo.netlify.app/sitemap.xml\n",
);
writeFileSync(
  join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/docs/", "/playground/", "/examples/", "/api/", "/benchmarks/", ...documentation.map((p) => p.url)].map((path) => `<url><loc>https://searchivo.netlify.app${path}</loc></url>`).join("")}</urlset>`,
);
