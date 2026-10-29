# Changelog

## Unreleased

- Guided playground experiments, reset, grouped controls, copyable configuration and a query/dataset inspector.
- Searchable documentation topics, learning paths and copyable examples.
- README previews and local onboarding, documentation/playground entry points, contributor and security guidance, issue forms and pull-request template.
- Repository Markdown-link validation and browser checks for the new developer flows.

Existing private candidate artifacts remain tied to their original revision. No package version or publication state changes in this documentation/UI increment.

## 0.1.0-rebuild.0 — private candidate

New implementation; no historical source or verification results were recovered.

- Core: strict typed inverted index, atomic validated mutations, stable weighted OR ranking, optional independently tested BM25, bounded one-edit fuzzy search, original-text Unicode highlight ranges, typed refinements/facets/sorting/pages, suggestions and cancellable state.
- Angular: scoped providers, readonly Signals and native input enhancement with IME and lifecycle handling; standalone OnPush/zoneless example.
- Workers: validated versioned protocol, explicit transport ownership and real browser/Node examples. Sparse wire arrays reject.
- Adapters: validated HTTP source with independent timeout/cancellation races and runtime document guards.
- Diagnostics: opt-in contribution explanations and bounded headless DevTools recording.
- Themes: optional scoped CSS and Sass tokens.
- Website: six static pages, real-package playground, safe highlight rendering, keyboard suggestions, worker/local parity, responsive layouts and raw benchmark links.
- Quality: per-file 100% library coverage, strict builds, isolated tarball consumers, executable Markdown examples, browser/axe checks, package graph rules, dependency audit, seeded 1k/10k/100k benchmarks and bundle budget.

### Limitations and migration

This is unpublished and pre-1.0. There is no compatibility promise with unavailable historical code. Tokenization is Unicode/NFKC with accents preserved, without stemming or language-specific segmentation. Fuzzy work is bounded and can truncate. Refinements follow ranking. Snapshots are shallow. Worker cancellation abandons replies and does not interrupt synchronous computation. The playground performs fuzzy/refinements/explanations locally even in worker-ranking mode. Compatibility covers only the versions in the release policy; no field Core Web Vitals or universal latency claim is made.

Packages remain private. npm publication, public releases and website deployment require separate authorization.
