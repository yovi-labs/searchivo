const select = (id, label, options) =>
  `<label class="control" for="${id}">${label}<select id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
const number = (id, label, value, min, max, step = 1) =>
  `<label class="control" for="${id}">${label}<input id="${id}" type="number" required value="${value}" min="${min}" max="${max}" step="${step}"></label>`;
const check = (id, label, checked = false) =>
  `<label class="inline-label"><input id="${id}" type="checkbox" ${checked ? "checked" : ""}>${label}</label>`;
export function playgroundPage(title) {
  return `${title("Developer playground / v0.1 candidate", "Find your relevance.", "A live workspace for exploring search. Choose an experiment, tune the engine, and inspect what changed.")}<div class="lab-toolbar"><div><span class="live-dot" aria-hidden="true"></span><strong>Product catalog</strong><span class="minor">12 synthetic documents · no network search</span></div><a href="/docs/#getting-started">Implementation guide ↗</a></div><section class="experiments" aria-label="Guided experiments"><button type="button" data-preset="exact"><span>01 / EXACT MATCH</span><strong>Start with relevance</strong><small>Field boosts and deterministic results</small></button><button type="button" data-preset="fuzzy"><span>02 / TYPO TOLERANCE</span><strong>Recover a misspelling</strong><small>Try “iphnoe” with one-edit matching</small></button><button type="button" data-preset="rank"><span>03 / EXPLAIN A SCORE</span><strong>Look inside BM25</strong><small>Compare real field contributions</small></button><button type="button" data-preset="worker"><span>04 / OFF THE MAIN THREAD</span><strong>Run ranking in a worker</strong><small>Same query, explicit execution boundary</small></button></section><p id="experiment-note" class="experiment-note" role="status">Start typing, or choose an experiment above. Every control uses the real Searchivo packages.</p><div id="playground" class="play-layout"><aside id="controls" class="controls" aria-label="Search controls"><div class="panel-heading"><h2>Configuration</h2><button id="reset-playground" class="quiet-button" type="button">Reset</button></div><details open><summary>Engine & relevance</summary>${select(
    "execution",
    "Execution",
    [
      ["local", "Local engine"],
      ["worker", "Web Worker"],
    ],
  )}${select("ranking", "Ranking", [
    ["default", "Weighted frequency"],
    ["bm25", "BM25"],
  ])}${number("boost", "Name field boost", 3, 0.1, 20, 0.1)}<div class="control-row">${number("k1", "BM25 k1", 1.2, 0.1, 5, 0.1)}${number("b", "BM25 b", 0.75, 0, 1, 0.05)}</div><p class="control-help">BM25 parameters apply when BM25 is selected.</p>${check("fuzzy", "One-edit fuzzy matching")}</details><details open><summary>Refine results</summary>${select(
    "category",
    "Category",
    [
      ["", "All categories"],
      ["Phones", "Phones"],
      ["Computers", "Computers"],
      ["Audio", "Audio"],
      ["Accessories", "Accessories"],
    ],
  )}${number("price", "Maximum price (USD)", 2000, 0, 5000, 50)}${check("stock", "In stock only")}${select(
    "sort",
    "Sort results",
    [
      ["score", "Relevance"],
      ["price", "Price: low to high"],
      ["name", "Name: A–Z"],
    ],
  )}${select("page-size", "Results per page", [
    ["3", "3"],
    ["6", "6"],
    ["12", "12"],
  ])}</details><details open><summary>Interaction & diagnostics</summary>${check("highlights", "Highlight matches", true)}${check("explain", "Explain Search")}${number("debounce", "Debounce (ms)", 100, 0, 1000, 50)}${number("minimum", "Minimum query length", 1, 0, 10)}</details></aside><section class="lab-results" aria-label="Search results"><div class="query-panel"><div class="panel-heading"><label for="query">Search the catalog</label><span class="minor">↑ ↓ select · Enter apply · Esc close</span></div><div class="search-area"><input id="query" type="text" role="combobox" aria-label="Search products" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestions" autocomplete="off" value="phone"><ul id="suggestions" role="listbox" aria-label="Suggestions" hidden></ul></div><div class="metrics"><span id="search-status" role="status">Loading playground…</span><span id="index-stats"></span></div><p id="execution-note" class="minor"></p></div><div class="results-heading"><h2>Results</h2><span class="minor">Ranked by the active strategy</span></div><p id="facets"></p><div id="results" class="cards"></div><div class="pagination"><button id="previous" type="button">← Previous</button><span id="page-status" class="minor"></span><button id="next" type="button">Next →</button></div><section class="inspector" aria-label="Search inspector"><div class="panel-heading"><h2>Search inspector</h2><span class="pill">Live output</span></div><p id="query-tokens" class="control-help"></p><details open><summary>Engine configuration</summary><p class="control-help">This snippet configures local ranking. Filters and worker orchestration are shown in the guide.</p><button id="copy-config" class="quiet-button" type="button">Copy configuration</button><span id="copy-status" class="control-help" role="status"></span><pre id="usage-code" tabindex="0" aria-label="Engine configuration code"></pre></details><details><summary>Explain Search output</summary><p class="control-help">Raw contributions before filters and pagination. Enable Explain Search to capture them.</p><pre id="explanation" tabindex="0" aria-label="Explanation JSON"></pre></details><details><summary>Dataset / 12 product fixtures</summary><p class="control-help">Synthetic demonstration data. Prices are illustrative, not shopping recommendations.</p><pre id="dataset-preview" tabindex="0" aria-label="Dataset JSON"></pre></details></section></section></div>`;
}
