import { playgroundPage } from "./site-playground.mjs";
import { documentation, renderDocumentation, publicApi } from "./site-docs.mjs";
import { build } from "esbuild";
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Searchivo adds ranked search, typo tolerance and filters to your Angular application with typed data and reactive Signals."><title>${escape(title)} · Searchivo</title><link rel="canonical" href="https://searchivo.netlify.app${path}"><link rel="stylesheet" href="/site.css"></head><body class="searchivo-theme"><a class="skip" href="#main">Skip to content</a><header><div class="shell navigation"><a class="brand" href="/" aria-label="Searchivo home"><span class="brand-icon" aria-hidden="true">[ / ]</span> SEARCHIVO</a><nav aria-label="Main navigation">${nav.map(([label, url]) => `<a href="${url}" ${url === path || (url === "/docs/" && path.startsWith("/docs/")) ? 'aria-current="page"' : ""}>${label}</a>`).join("")}<a class="github" href="https://github.com/yovi-labs/searchivo">GitHub ↗</a></nav></div></header><main id="main" class="shell">${content}</main><footer><div class="shell"><span>SEARCHIVO — Fast search. Simple API.</span><span>0.1.0 · MIT licensed · <a href="/docs/tutorial/">Get started</a></span></div></footer><script type="module" src="/site.js"></script></body></html>`;
}
const pageTitle = (eyebrow, title, description) =>
  `<div class="page-title"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="lede">${description}</p></div>`;
const home = `<section class="hero"><div class="eyebrow">SEARCH FOR ANGULAR APPLICATIONS</div><h1>SEARCH<br><span>AT SPEED.</span></h1><p class="lede">Full-text search for Angular.<br>A simple, typed API for ranked results, typo tolerance, and filters.</p><div class="actions"><a class="button primary" href="/docs/tutorial/">Get started <span aria-hidden="true">&nbsp;↗</span></a><a class="button" href="/playground/">Explore the playground</a></div><span class="minor">ZERO CORE DEPENDENCIES &nbsp; / &nbsp; TYPED BY DEFAULT &nbsp; / &nbsp; OPEN SOURCE</span></section><section aria-label="Live search and code" class="demo"><div class="demo-live"><div class="demo-top">01 — Try real search</div><div class="demo-content"><label for="home-query">Search demo products</label><input id="home-query" value="phone" type="search" autocomplete="off"><p id="home-status" class="minor" role="status"></p><ul id="home-results" class="result-list"></ul></div></div><div><div class="demo-top">02 — That’s the API <span class="pill">TypeScript</span></div><div class="demo-content"><pre><code><span class="code-accent">import</span> { createSearchEngine }
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

<span class="code-note">// Your documents. Deterministic results.</span></code></pre></div></div></section><section class="section"><div class="section-heading"><h2>Everything a useful search experience needs.</h2><span class="minor">IMPORT ONLY WHAT YOU NEED</span></div><div class="features"><div class="feature"><span class="number">01 / RELEVANCE</span><h3>Find the right result.</h3><p>Prioritize important fields, rank longer content with BM25 and recover from common typos. Help people find what they meant.</p></div><div class="feature"><span class="number">02 / ANGULAR</span><h3>Fit your existing app.</h3><p>Connect a native input to reactive Signals. Use OnPush, zoneless change detection and your own components, HTML and styles.</p></div><div class="feature"><span class="number">03 / DISCOVERY</span><h3>Make results easier to explore.</h3><p>Combine filters, facet counts, sorting, pagination and suggestions to turn a result list into a useful discovery experience.</p></div></div></section>`;
const officialHome =
  home +
  `<section class="section install-section" aria-label="Install Searchivo"><div><div class="eyebrow">START IN YOUR OWN PROJECT</div><h2>One install. Your Angular app.</h2><p>Searchivo is an npm dependency. Connect your data and keep the interface you already have.</p><a class="button primary" href="/docs/angular/">Follow the Angular quickstart</a></div><div><pre><code>npm install @searchivo/core@0.1.0 @searchivo/angular@0.1.0</code></pre><p class="control-help">0.1.0 is awaiting npm publication. Tested with Angular 22.2.3.</p></div></section>` +
  '<section class="section"><div class="section-heading"><h2>A real application, built with Searchivo.</h2></div><p class="lede">Explore 10,000 fictional products, refine your search, inspect product details and save your favorites in Searchivo Market.</p><div class="actions"><a class="button primary" href="https://searchivo-market.netlify.app/">Open Searchivo Market ↗</a><a class="button" href="/docs/angular/">Build search in your app</a></div><p>The application is a separate Angular project. All demonstration products and prices are fictional.</p></section>';
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
let renderedGuide = renderDocumentation(guide);
for (const heading of docsNav)
  renderedGuide = renderedGuide.replace(
    `<h2>${heading}</h2>`,
    `<h2 id="${slug(heading)}">${heading}</h2>`,
  );
const sections = renderedGuide.split(/(?=<h2 id=)/);
const docs = `${pageTitle("Documentation / v0.1.0", "Build search with confidence.", "Start with a working query. Add relevance, interaction and integrations when your application needs them.")}<div class="learning-paths"><a href="#getting-started"><span>01 / START HERE</span><strong>Your first search</strong><small>npm install → index data → render results</small></a><a href="#angular"><span>02 / INTEGRATE</span><strong>Connect your Angular app</strong><small>Native inputs, Signals and your own markup</small></a><a href="/playground/"><span>03 / EXPERIMENT</span><strong>Tune in the playground</strong><small>Explore the actual package behavior ↗</small></a></div><div class="docs-grid"><aside class="docs-sidebar" aria-label="Documentation navigation"><label for="docs-search">Find in the guide</label><input id="docs-search" type="search" placeholder="Try cancellation or fuzzy…" aria-describedby="docs-search-status"><p id="docs-search-status" class="control-help" role="status">${docsNav.length} topics</p><nav class="docs-nav" aria-label="Documentation sections">${docsNav.map((title) => `<a href="#${slug(title)}">${title}</a>`).join("")}</nav><a class="source-link" href="https://github.com/yovi-labs/searchivo/blob/develop/docs/guide.md">Contribute a documentation fix ↗</a></aside><article class="guide-content">${sections.map((section, i) => (i === 0 ? section : `<section data-doc-section>${section}</section>`)).join("")}<p id="docs-empty" hidden>No matching topics. Try “ranking”, “worker”, or “state”.</p></article></div>`;
const examples = `${pageTitle("Examples", "See what you can build.", "Try a complete Angular search experience, then use the npm packages to build it into your own application.")}<div class="learning-paths"><a href="https://searchivo-market.netlify.app/"><span>PRODUCT DISCOVERY</span><strong>Searchivo Market</strong><small>Search 10,000 fictional products. Filter, sort, view details and save favorites.</small></a><a href="https://searchivo-market.netlify.app/#minimal"><span>ANGULAR BASICS</span><strong>A native input and reactive results</strong><small>See scoped providers, Signals and a native search input working together.</small></a><a href="/playground/"><span>RELEVANCE</span><strong>Compare search settings</strong><small>Try field boosts, BM25, typo tolerance and refinements with a small dataset.</small></a></div><article><h2>Bring search to your product</h2><p>For a catalog, boost the product name and add category or price filters. For a help center, index titles and article text, then try BM25 ranking. For an internal record list, keep the search input and results inside your existing Angular component.</p><h2>Start with the Angular integration</h2><p>Install core and Angular from npm, choose the searchable fields and connect the binding to your template. You own the interface and the documents you index.</p><a class="button primary" href="/docs/angular/">Build your Angular search</a><h2>Explore advanced integrations when needed</h2><p>The separate <a href="https://searchivo-market.netlify.app/#features">integration lab</a> demonstrates async sources and lifecycle behavior. These are implementation choices after the basic search experience works.</p><p>All Market products, prices, ratings and stock values are fictional. The demo has no checkout.</p></article>`;
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
      `<a href="${page.url}"><small>${page.group}</small><span>${escape(page.title)}</span></a>`,
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
function documentationPage(page) {
  const html = renderDocumentation(page.text);
  const title = page.text.match(/^# (.+)/)?.[1] ?? page.title;
  const headings = [...html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)];
  const index = documentation.indexOf(page);
  const adjacent = [documentation[index - 1], documentation[index + 1]].filter(
    Boolean,
  );
  return `${pageTitle(page.group, escape(title), "Install from npm. Build with Angular. Make search your own.")}<div class="docs-grid"><aside class="docs-sidebar"><a class="docs-home-link" href="/docs/">All documentation</a><nav class="docs-nav" aria-label="Documentation library">${documentation.map((item) => `<a href="${item.url}" ${item.id === page.id ? 'aria-current="page"' : ""}><small>${item.group}</small><span>${escape(item.title)}</span></a>`).join("")}</nav></aside><article class="guide-content"><nav class="on-this-page" aria-label="On this page"><strong>In this guide</strong>${headings.map(([, id, heading]) => `<a href="#${id}">${heading}</a>`).join("")}</nav>${html}<div class="next-guides">${adjacent.map((item) => `<a href="${item.url}"><small>Keep building</small><strong>${escape(item.title)} →</strong></a>`).join("")}</div></article></div>`;
}
for (const [path, title, content] of [
  ["/", "Home", officialHome],
  ["/docs/", "Docs", expandedDocs],
  ["/playground/", "Playground", playground],
  ["/examples/", "Examples", examples],
  ["/benchmarks/", "Benchmarks", benchmarks],
  ["/api/", "API", api],
  ...documentation.map((page) => [
    page.url,
    page.title,
    documentationPage(page),
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
