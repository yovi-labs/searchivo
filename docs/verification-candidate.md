# Private candidate verification — 2026-10-29

This evidence concerns the new rebuild, not historical code. Website milestone `f100c30fcba028b5d4b8385ae51b8618f14f595f` passed [GitHub CI](https://github.com/yovi-labs/searchivo/actions/runs/40882380950). Release hardening source is `00981dd303b4d2bba8e3a0b408d0a84ae6b7cea4`; candidate manifests identify their exact later packaging revision.

## Checks executed

- Strict TypeScript project builds and Angular partial compilation; lint and formatting.
- 47 library tests: 577/577 statements, 379/379 branches, 110/110 functions, 527/527 lines. Per-file thresholds remain 100%; no coverage exclusions added.
- Sparse structured-clone array regression tests for worker requests, results and suggestions.
- Isolated actual-tarball ESM/types consumers, strict Angular AOT, real local HTTP round trip, worker types, recorder lifecycle, CSS resolution and Sass NodePackageImporter.
- Both complete TypeScript Markdown examples compile and execute from installed tarballs; exported paths, license, repository, version and private metadata are checked.
- Six Chromium browser tests cover Angular IME, Signals/native input, module workers, homepage search, playground keyboard suggestions, fuzzy results, local/worker parity, filters, pagination, invalid controls and safe rendering. Axe reports no violations on the tested views. Desktop/mobile screenshots inspected; mobile horizontal overflow checked.
- Website production build and 84 internal page/anchor/asset links checked before the two new benchmark reports were added. The link count grows with reports.
- Dependency audit reported no known vulnerabilities. Core compiles without DOM/Node ambient types; all library dependency directions and explicit-any boundaries are enforced.

## Measurements and scope

Basic core: 2,564 raw / 1,248 gzip / 1,111 Brotli bytes. Optional modules are absent from the basic consumer. The unchanged budget is 5,000 gzip bytes. Angular integration: 1,759 / 831 / 727 bytes with Angular and core external. Independent optional entry bundles are recorded in [optional-bundle-measurements.json](optional-bundle-measurements.json); these are not additive application costs.

Fresh seeded engine report: [2026-10-29T13-33-34.344Z.json](../benchmarks/reports/2026-10-29T13-33-34.344Z.json), clean source `00981dd`. Fresh worker report: [workers-2026-10-29T13-33-36.500Z.json](../benchmarks/reports/workers-2026-10-29T13-33-36.500Z.json), same source, dirty only because the immediately preceding engine report was untracked. Both preserve raw samples and environment. There are 1k/10k/100k workloads; engine workloads distinguish repeated and high-cardinality dictionaries. Reports are synthetic evidence, not production guarantees or a cross-machine regression baseline.

## Compatibility and remaining limits

Verified Node 24.22.1, TypeScript 6.0.3, Angular 22.2.3 and Playwright 1.64.1 Chromium. Other combinations are unverified. No browser field Core Web Vitals claim. Native browser accessibility checks do not certify arbitrary consumers.

Snapshots are shallow; tokenization has no stemming or language-specific segmentation. Fuzzy traversal can truncate; filtering follows ranking. Worker abort abandons replies rather than interrupting CPU work. Playground fuzzy/refinements/explanations remain local in worker mode and the UI states that scope.

Candidate generation requires a clean revision and matching packed-validation receipt. SHA-256 manifests, extracted-file comparison receipts and ZIPs live together in ignored `artifacts/candidate-<revision>`. Packages remain private and unpublished; no public release, main merge or website deployment was performed.
