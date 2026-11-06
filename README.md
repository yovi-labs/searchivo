# SEARCHIVO

**Fast search. Simple API.**

A TypeScript-first search toolkit with a zero-dependency core, optional Angular Signals, workers, HTTP adapters and diagnostics. Keep control of your documents, ranking and interface.

[![Quality](https://github.com/yovi-labs/searchivo/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/yovi-labs/searchivo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-a6e3d4)](LICENSE)
[![Version: 0.1.0 prepared](https://img.shields.io/badge/version-0.1.0_prepared-ff65b3)](docs/publishing.md)

## Official website

[**searchivo.netlify.app →**](https://searchivo.netlify.app/) is the official Searchivo website.

- [Documentation](https://searchivo.netlify.app/docs/): tutorials, concepts, recipes and the complete public API.
- [Interactive playground](https://searchivo.netlify.app/playground/): exact/fuzzy matching, BM25, filters, suggestions, workers and explanations.
- [API reference](https://searchivo.netlify.app/api/) and [benchmark evidence](https://searchivo.netlify.app/benchmarks/).

![Searchivo playground](docs/assets/playground.png)

## A real application using Searchivo

[**Open Searchivo Market →**](https://searchivo-market.netlify.app/)

A separate Angular product-discovery application with a complete UI: 10,000 fictional products, live BM25 search, typo recovery, category/brand/price/stock refinements, sorting, pagination, product details and a saved-products list persisted in your browser. Searchivo performs the actual retrieval and refinements. There is no checkout or sale of products.

[Feature integration lab](https://searchivo-market.netlify.app/#features) · [Minimal Angular example](https://searchivo-market.netlify.app/#minimal) · [Application source](apps/angular-example/src) · [Deployment configuration](apps/angular-example/netlify.toml)

The official website and Market deploy to **two independent Netlify projects**. [Build and deployment guide](docs/deployment.md).

## Installation

Version **0.1.0 is prepared for publication**. Until the maintainer publishes it, use the workspace or validated release tarballs. The registry commands below apply after publication:

```sh
npm install @searchivo/core@0.1.0
# Optional Angular integration; install in an Angular 22.2.3 application
npm install @searchivo/angular@0.1.0
```

For a local consumer before publication:

```sh
npm install /absolute/path/searchivo-core-0.1.0.tgz
```

[Publishing guide](docs/publishing.md) covers the six-package publish order, release artifacts, namespace access and verification. Builds and release preparation never publish packages.

## Your first search

```ts
import { createSearchEngine } from "@searchivo/core";

type Product = { id: number; name: string; description: string };
const search = createSearchEngine<Product>({
  id: "id",
  fields: { name: { boost: 3 }, description: {} },
});
search.add([
  { id: 1, name: "Apple iPhone 15 Pro", description: "Premium smartphone" },
]);
const results = search.search("iphone");
// [{ id: 1, document: ..., score: 3 }]
```

This example compiles and runs against the installed tarball in CI. See the [complete executable example](examples/core.ts) for BM25, fuzzy matching, highlights, refinements, suggestions and state.

## Packages

| Package               | Responsibility                                                         | Reference                               |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `@searchivo/core`     | Inverted index, atomic mutations, ranking and optional search features | [Core](packages/core/README.md)         |
| `@searchivo/angular`  | Scoped providers, readonly Signals and native inputs with IME handling | [Angular](packages/angular/README.md)   |
| `@searchivo/workers`  | Validated protocol and explicit transport ownership                    | [Workers](packages/workers/README.md)   |
| `@searchivo/adapters` | Validated HTTP sources, timeouts and cancellation                      | [Adapters](packages/adapters/README.md) |
| `@searchivo/devtools` | Bounded local state-transition recording                               | [DevTools](packages/devtools/README.md) |
| `@searchivo/themes`   | Optional scoped CSS and Sass tokens                                    | [Themes](packages/themes/README.md)     |

Core never imports Angular, RxJS, DOM or Node ambient types. Optional features use explicit entry points and remain outside the basic consumer bundle. [Public export inventory](docs/public-api.md).

## Run and verify the workspace

Use Node **24.22.1** and pnpm **11.28.9**, matching CI.

```sh
git clone --branch develop https://github.com/yovi-labs/searchivo.git
cd searchivo
pnpm install --frozen-lockfile
pnpm build:deploy
pnpm preview:website
# In another terminal: node scripts/serve.mjs dist/deploy/example 4173
```

The official site previews at port 4174; Market previews at port 4173. The previews serve production output, so rebuild after edits.

```sh
pnpm check
pnpm build:deploy
pnpm test:endpoints
pnpm exec playwright install chromium
pnpm test:browser
pnpm audit --audit-level=low
```

The quality gate enforces strict types, per-file 100% library coverage, dependency boundaries, six installed-tarball consumers, complete Markdown examples, Angular AOT, package metadata and public npm publish dry runs. Browser checks exercise selected desktop/mobile layouts, keyboard, simulated IME, cancellation, errors, real workers/HTTP and accessibility with axe.

The basic core consumer measures **2,564 bytes raw / 1,248 gzip / 1,111 Brotli**, within the unchanged 5,000-byte gzip budget. Seeded 1k/10k/100k engine and worker reports plus real 10k-catalog measurements retain raw samples and environment. These are synthetic measurements, not production latency guarantees. [Performance and complexity](docs/performance.md).

## Compatibility and limits

MIT licensed, pre-1.0 and tested with Node 24.22.1, TypeScript 6.0.3, Angular 22.2.3 and Playwright Chromium. Other combinations remain unverified. Documents are shallow snapshots; queries use whole-token OR matching without stemming; fuzzy expansion can truncate; filtering follows ranking; cancellation abandons replies without interrupting synchronous CPU work. Heavy main-thread indexes may need a Worker. HTTP fixtures demonstrate transport behavior and are not a production search backend.

[Documentation source](docs/README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Release preparation](docs/publishing.md)
