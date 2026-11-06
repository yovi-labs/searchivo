# Changelog

## Unreleased

- Make public documentation Angular-first with npm installation, a complete standalone component, practical concepts, readable navigation and code panels. Separate contributor/release operations from consumer guides; keep MIT rights and the fork/pull-request contribution workflow explicit.

- Prepare six synchronized public npm packages at 0.1.0, preserving current APIs. Public access metadata, registry-compatible packed dependencies, installed consumers, publish dry runs, clean-revision archives and SHA-256 manifests support maintainer publication. Workspace/apps remain private; no npm publication runs automatically.
- Restore the official landing/docs/playground to searchivo.netlify.app and move the Angular application to the independent searchivo-market Netlify project. Separate outputs/configuration and deployment regressions prevent mixing the sites.
- Open Searchivo Market at its root with product details, keyboard-accessible native dialogs, and up to 100 saved products with validated browser persistence and graceful storage fallback. Preserve fictional-data labels and the feature/minimal integration views.

- Deliver the actual Angular app and searchable documentation together on Netlify, with public example navigation and bounded working HTTP fixtures. Add complete public-export declarations, tutorials, recipes and operational references; validate all complete Markdown TypeScript examples, including Angular strict AOT.
- Keep playground controls disabled until lazy initialization attaches input handlers, and show a recoverable load error when the module fails. Clean generated website output before rebuilding to exclude obsolete chunks.
- Skip grapheme mapping for empty highlight queries; the 24-name catalog benchmark median falls from 0.2851 to 0.0034 ms on the recorded machine. Preserve public APIs and reuse feature-lab fuzzy/autocomplete derived indexes between queries.
- Add shared endpoint validation and deployment/browser regressions. No npm publication, public release, package version change or merge to main.

- Add an Angular shopping catalog with 10,000 deterministic fictional products, BM25 retrieval, fallback typo recovery, filters, sorting, pagination and browser verification for manual integration testing.

- Fix Angular feature-lab query/refinement synchronization, pending-search cancellation, IME composition and document preservation across ranking changes. Add browser regressions for all five review findings and reusable `createDebouncer.cancel()`.

- Pin build-toolchain minimatch to patched 11.0.1 for [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249); preserve the dependency-audit gate.

- Angular feature lab with real worker/HTTP fixtures, ranking/mutation/refinement controls, grouped suggestions, diagnostic views and browser integration coverage across every package. The minimal directive example and isolated strict-AOT consumer remain available.

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
