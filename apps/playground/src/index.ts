import { createSearchEngine, tokenize } from "@searchivo/core";
import { bm25 } from "@searchivo/core/bm25";
import { createFuzzySearch } from "@searchivo/core/fuzzy";
import { highlight } from "@searchivo/core/highlight";
import { refine } from "@searchivo/core/refinements";
import type { Filter } from "@searchivo/core/refinements";
import { createAutocomplete } from "@searchivo/core/suggestions";
import { createSearchState, createDebouncer } from "@searchivo/core/state";
import { explainSearch } from "@searchivo/core/explain";
import type { SearchExplanation } from "@searchivo/core/explain";
import { createWorkerClient } from "@searchivo/workers/client";
import { webTransport } from "@searchivo/workers/web";
import { isProduct } from "./model.js";
import type { Product } from "./model.js";
function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing playground element ${id}`);
  return found as T;
}
/** Mount the real-package playground and return lifecycle cleanup. */
export function mountPlayground(documents: readonly Product[]): () => void {
  const input = element<HTMLInputElement>("query"),
    list = element<HTMLElement>("results"),
    suggestions = element<HTMLUListElement>("suggestions");
  const value = (id: string) => element<HTMLInputElement>(id).value;
  const checked = (id: string) => element<HTMLInputElement>(id).checked;
  const defaults = new Map(
    [
      ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "#controls input, #controls select",
      ),
    ].map((control) => [
      control.id,
      {
        value: control.value,
        checked: control instanceof HTMLInputElement && control.checked,
      },
    ]),
  );
  element("dataset-preview").textContent = JSON.stringify(documents, null, 2);
  let offset = 0,
    activeSuggestion = -1,
    composing = false,
    suggestionTerms: readonly string[] = [];
  let engine = makeEngine();
  let autocomplete = createAutocomplete(engine),
    fuzzy = createFuzzySearch(engine);
  let worker: ReturnType<typeof createWorkerClient<Product>> | undefined;
  let ready: Promise<unknown> = Promise.resolve();
  function makeEngine() {
    return createSearchEngine<Product>(
      {
        id: "id",
        fields: { name: { boost: Number(value("boost")) }, description: {} },
        ...(value("ranking") === "bm25"
          ? {
              ranking: bm25({ k1: Number(value("k1")), b: Number(value("b")) }),
            }
          : {}),
      },
      documents,
    );
  }
  function startWorker(): void {
    worker?.dispose();
    worker = undefined;
    if (value("execution") === "worker") {
      const params = new URLSearchParams({
        ranking: value("ranking"),
        k1: value("k1"),
        b: value("b"),
        boost: value("boost"),
      });
      const instance = new Worker(`/playground-worker.js?${params}`, {
        type: "module",
      });
      const client = createWorkerClient(
        webTransport(instance, () => instance.terminate()),
        isProduct,
        true,
      );
      worker = client;
      ready = client
        .request("ready", null)
        .then(() => client.request("add", documents));
      void ready.catch(() => {}); // The active source awaits and exposes readiness failures.
    } else ready = Promise.resolve();
  }
  const controller = createSearchState<Product>(
    async (request, signal) => {
      const expanded = checked("fuzzy")
        ? fuzzy(request.query).terms
        : tokenize(request.query);
      const currentWorker = worker;
      let hits;
      if (currentWorker) {
        await ready;
        hits = await currentWorker.request(
          "search",
          expanded.join(" "),
          signal,
        );
      } else hits = engine.search(expanded.join(" "));
      const explanation = checked("explain")
        ? explainSearch(engine, request.query, {
            expandedTerms: expanded,
            now: () => performance.now(),
          })
        : undefined;
      return { ...refine(hits, request), metadata: { expanded, explanation } };
    },
    () => performance.now(),
  );
  function search(): void {
    if (!validControls()) return;
    const filters: Filter<Product>[] = [];
    if (value("category"))
      filters.push({ field: "category", op: "eq", value: value("category") });
    if (checked("stock"))
      filters.push({ field: "stock", op: "eq", value: true });
    filters.push({ field: "price", op: "range", max: Number(value("price")) });
    const sort =
      value("sort") === "price"
        ? { field: "price" as const, direction: "asc" as const }
        : value("sort") === "name"
          ? { field: "name" as const, direction: "asc" as const }
          : undefined;
    const query =
      input.value.length >= Number(value("minimum")) ? input.value : "";
    void controller.search({
      query,
      filters,
      facets: ["category"],
      offset,
      limit: Number(value("page-size")),
      ...(sort ? { sort } : {}),
    });
  }
  const scheduler = (callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  };
  let debounce = createDebouncer(search, scheduler, Number(value("debounce")));
  function closeSuggestions(): void {
    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }
  function selectSuggestion(term: string): void {
    input.value = term;
    closeSuggestions();
    offset = 0;
    debounce.dispose();
    debounce = createDebouncer(search, scheduler, Number(value("debounce")));
    search();
    input.focus();
  }
  function showSuggestions(): void {
    suggestionTerms =
      input.value.length >= Number(value("minimum"))
        ? autocomplete(input.value, 6)
        : [];
    suggestions.replaceChildren(
      ...suggestionTerms.map((term, i) => {
        const option = document.createElement("li");
        option.id = `suggestion-${i}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.textContent = term;
        option.addEventListener("mousedown", (event) => event.preventDefault());
        option.addEventListener("click", () => selectSuggestion(term));
        return option;
      }),
    );
    activeSuggestion = -1;
    input.removeAttribute("aria-activedescendant");
    suggestions.hidden = !suggestionTerms.length;
    input.setAttribute(
      "aria-expanded",
      String(Boolean(suggestionTerms.length)),
    );
  }
  const onInput = () => {
    if (composing) return;
    offset = 0;
    showSuggestions();
    debounce.submit(undefined);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }
    if (suggestions.hidden) return;
    if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestionTerms[activeSuggestion]!);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    activeSuggestion =
      (activeSuggestion +
        (event.key === "ArrowDown" ? 1 : -1) +
        suggestionTerms.length) %
      suggestionTerms.length;
    [...suggestions.children].forEach((option, i) =>
      option.setAttribute("aria-selected", String(i === activeSuggestion)),
    );
    input.setAttribute(
      "aria-activedescendant",
      `suggestion-${activeSuggestion}`,
    );
  };
  function renderText(parent: HTMLElement, text: string, query: string): void {
    if (!checked("highlights")) {
      parent.textContent = text;
      return;
    }
    let cursor = 0;
    for (const range of highlight(text, query)) {
      parent.append(document.createTextNode(text.slice(cursor, range.start)));
      const mark = document.createElement("mark");
      mark.textContent = text.slice(range.start, range.end);
      parent.append(mark);
      cursor = range.end;
    }
    parent.append(document.createTextNode(text.slice(cursor)));
  }
  const unsubscribe = controller.subscribe((state) => {
    element("search-status").textContent = state.error
      ? `Search failed: ${state.error instanceof Error ? state.error.message : String(state.error)}`
      : state.loading
        ? "Searching…"
        : `${state.total} results · ${state.duration.toFixed(2)} ms`;
    element("search-status").classList.toggle(
      "status-error",
      Boolean(state.error),
    );
    const expanded = state.metadata?.expanded as readonly string[] | undefined;
    const highlightQuery = expanded?.join(" ") ?? state.query;
    element("query-tokens").textContent =
      `Query tokens: ${tokenize(state.query).join(" · ") || "none"} → Expanded terms: ${expanded?.join(" · ") || "none"}`;
    const stats = engine.stats();
    element("index-stats").textContent =
      `${stats.documents} documents / ${stats.terms} terms`;
    list.replaceChildren(
      ...state.results.map((hit, index) => {
        const card = document.createElement("article"),
          title = document.createElement("h2"),
          description = document.createElement("p"),
          meta = document.createElement("div");
        card.className = "result-card";
        meta.className = "result-meta";
        const rank = document.createElement("span");
        rank.className = "rank-label";
        rank.textContent = `#${offset + index + 1} · ${hit.document.category}`;
        renderText(title, hit.document.name, highlightQuery);
        renderText(description, hit.document.description, highlightQuery);
        meta.textContent = `${hit.document.category} · $${hit.document.price} · ${hit.document.stock ? "In stock" : "Unavailable"} · score ${hit.score.toFixed(4)}`;
        card.append(rank, title, description, meta);
        return card;
      }),
    );
    if (!state.loading && !state.results.length) {
      const empty = document.createElement("p");
      empty.textContent = state.query
        ? "No matches. Try a broader query or reset the filters."
        : "Enter a query to search the demo fixtures.";
      list.append(empty);
    }
    element("facets").textContent =
      `Facets after filters, before pagination: ${state.facets.category?.map((f) => `${f.value} (${f.count})`).join(" · ") || "none"}`;
    element<HTMLButtonElement>("previous").disabled = offset === 0;
    element<HTMLButtonElement>("next").disabled =
      offset + Number(value("page-size")) >= state.total;
    element("page-status").textContent =
      `Page ${Math.floor(offset / Number(value("page-size"))) + 1}`;
    const explanation = state.metadata?.explanation as
      SearchExplanation<Product> | undefined;
    element("explanation").textContent = explanation
      ? JSON.stringify(explanation, null, 2)
      : "Enable Explain Search to capture contributions. Worker explanations are recomputed locally with the same configuration.";
    element("usage-code").textContent =
      `const engine = createSearchEngine<Product>({\n  id: 'id',\n  fields: { name: { boost: ${value("boost")} }, description: {} },\n${value("ranking") === "bm25" ? `  ranking: bm25({ k1: ${value("k1")}, b: ${value("b")} }),\n` : ""}});\nengine.add(products);\nconst hits = engine.search(${JSON.stringify(state.query)});`;
    element("execution-note").textContent =
      value("execution") === "worker"
        ? "Worker ranking round trip; fuzzy expansion, refinements and optional explanations run locally."
        : "Local execution. Duration includes configured search, refinements and optional explanations.";
  });
  function validControls(): boolean {
    const invalid = document.querySelector<HTMLInputElement>(
      "#controls input:invalid",
    );
    if (!invalid) return true;
    element("search-status").textContent =
      `Invalid setting: ${invalid.labels?.[0]?.textContent ?? invalid.id}. ${invalid.validationMessage}`;
    element("search-status").classList.add("status-error");
    return false;
  }
  const rebuild = () => {
    controller.cancel();
    if (!validControls()) return;
    engine = makeEngine();
    autocomplete = createAutocomplete(engine);
    fuzzy = createFuzzySearch(engine);
    startWorker();
    offset = 0;
    debounce.dispose();
    debounce = createDebouncer(search, scheduler, Number(value("debounce")));
    closeSuggestions();
    search();
  };
  const controls = element("controls");
  controls.addEventListener("change", rebuild);
  function reset(): void {
    for (const [id, initial] of defaults) {
      const control = element<HTMLInputElement | HTMLSelectElement>(id);
      control.value = initial.value;
      if (control instanceof HTMLInputElement)
        control.checked = initial.checked;
    }
    input.value = "phone";
    document
      .querySelectorAll<HTMLButtonElement>("[data-preset]")
      .forEach((button) => button.setAttribute("aria-pressed", "false"));
    element("experiment-note").textContent =
      "Default configuration restored. Search for phone, apple, or laptop.";
  }
  const onReset = () => {
    reset();
    rebuild();
  };
  const presetButtons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-preset]"),
  ];
  const onPreset = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    reset();
    button.setAttribute("aria-pressed", "true");
    switch (button.dataset["preset"]) {
      case "fuzzy":
        input.value = "iphnoe";
        element<HTMLInputElement>("fuzzy").checked = true;
        element("experiment-note").textContent =
          "Typo recovery: “iphnoe” expands to “iphone”. Turn fuzzy matching off to compare.";
        break;
      case "rank":
        input.value = "apple";
        element<HTMLSelectElement>("ranking").value = "bm25";
        element<HTMLInputElement>("explain").checked = true;
        element("experiment-note").textContent =
          "BM25: compare Apple results, then open Explain Search output to inspect each field contribution.";
        break;
      case "worker":
        input.value = "laptop";
        element<HTMLSelectElement>("execution").value = "worker";
        element("experiment-note").textContent =
          "Worker ranking: the query runs through a module Worker. Fuzzy expansion, refinements and explanations stay local.";
        break;
      default:
        element("experiment-note").textContent =
          "Exact relevance: name matches receive a 3× field boost. Change the boost and compare scores.";
    }
    rebuild();
  };
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        element("usage-code").textContent ?? "",
      );
      element("copy-status").textContent = "Configuration copied.";
    } catch {
      element("copy-status").textContent =
        "Clipboard unavailable. Select and copy the code below.";
    }
  };
  presetButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", onPreset);
  });
  element("reset-playground").addEventListener("click", onReset);
  element("copy-config").addEventListener("click", onCopy);
  const previous = () => {
      offset = Math.max(0, offset - Number(value("page-size")));
      search();
    },
    next = () => {
      offset += Number(value("page-size"));
      search();
    };
  const compositionStart = () => {
      composing = true;
    },
    compositionEnd = () => {
      composing = false;
      onInput();
    };
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKey);
  input.addEventListener("blur", closeSuggestions);
  input.addEventListener("compositionstart", compositionStart);
  input.addEventListener("compositionend", compositionEnd);
  element("previous").addEventListener("click", previous);
  element("next").addEventListener("click", next);
  search();
  return () => {
    unsubscribe();
    controller.dispose();
    debounce.dispose();
    worker?.dispose();
    controls.removeEventListener("change", rebuild);
    presetButtons.forEach((button) =>
      button.removeEventListener("click", onPreset),
    );
    element("reset-playground").removeEventListener("click", onReset);
    element("copy-config").removeEventListener("click", onCopy);
    input.removeEventListener("input", onInput);
    input.removeEventListener("keydown", onKey);
    input.removeEventListener("blur", closeSuggestions);
    input.removeEventListener("compositionstart", compositionStart);
    input.removeEventListener("compositionend", compositionEnd);
    element("previous").removeEventListener("click", previous);
    element("next").removeEventListener("click", next);
  };
}
