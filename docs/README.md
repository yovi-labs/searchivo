# Searchivo documentation

Build a local search experience with explicit ownership, typed data and optional integrations.

[Live documentation](https://searchivo.netlify.app/docs/) · [Live Angular application](https://searchivo-market.netlify.app/) · [10,000-product catalog](https://searchivo-market.netlify.app/) · [Feature lab](https://searchivo-market.netlify.app/#features) · [Angular source](../apps/angular-example/src)

## Learning library

- Tutorial: [Your first typed search](tutorial.md).
- Concepts: [Engine and integration contracts](guide.md).
- Recipes: [Angular](angular.md), [async state, HTTP and workers](recipes.md).
- Reference: [Core](reference-core.md), [interaction](reference-interaction.md), [Angular](reference-angular.md), [integrations](reference-integrations.md), [public inventory](public-api.md).
- Operations: [Performance and complexity](performance.md), [security](security.md), [deployment and troubleshooting](deployment.md).

## Choose a path

| Goal                             | Start here                                                                  | Runnable source                                            |
| -------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Search typed documents           | [Getting started](guide.md#getting-started)                                 | [Core example](../examples/core.ts)                        |
| Tune relevance                   | [Ranking](guide.md#query-semantics-and-ranking)                             | [Playground](../apps/playground/README.md)                 |
| Handle typos and highlights      | [Fuzzy matching](guide.md#fuzzy-matching-and-highlights)                    | [Core example](../examples/core.ts)                        |
| Build a results interface        | [Filters, facets and pages](guide.md#filters-facets-sorting-and-pagination) | [Playground source](../apps/playground/src/index.ts)       |
| Add Angular                      | [Angular integration](../packages/angular/README.md)                        | [Standalone example](../apps/angular-example/src/main.ts)  |
| Move ranking off the main thread | [Worker contract](../packages/workers/README.md)                            | [Worker client](../examples/browser-worker-client.ts)      |
| Connect a backend                | [HTTP adapter](../packages/adapters/README.md)                              | [Validated HTTP consumer](../scripts/validate-package.mjs) |
| Understand scores                | [Explanations](guide.md#explanations-and-devtools)                          | [Core example](../examples/core.ts)                        |

## Browse the local documentation site

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm build:website
pnpm preview:website
```

Open [documentation](http://127.0.0.1:4174/docs/) or the [playground](http://127.0.0.1:4174/playground/) while the preview is running. The guide has topic search, copyable examples and links to generated API declarations. These are local preview URLs. Use the public links above for shared demos.

## Reference and maintenance

- [Complete guide](guide.md): semantics, ownership, cancellation, integration and troubleshooting.
- [Architecture decisions](adr): rationale and tradeoffs behind the implementation.
- [Benchmark methodology](../benchmarks/README.md): seeded workloads, raw samples and interpretation.
- [Publishing and version policy](publishing.md): validated public artifacts, manual publishing order and account prerequisites.
- [Verification evidence](verification-candidate.md): scoped checks for the original private candidate.
- [Contributing](../CONTRIBUTING.md): workspace commands and review expectations.

The library is pre-1.0 and unpublished. Use the workspace or validated release tarballs until npm publication. The Markdown guide is the source for the website; update it directly when changing behavior.
