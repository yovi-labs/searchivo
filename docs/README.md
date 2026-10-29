# Searchivo documentation

Build a local search experience with explicit ownership, typed data and optional integrations.

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

Open [documentation](http://127.0.0.1:4174/docs/) or the [playground](http://127.0.0.1:4174/playground/) while the preview is running. The guide has topic search, copyable examples and links to generated API declarations. These are local preview URLs; a public website has not been deployed.

## Reference and maintenance

- [Complete guide](guide.md): semantics, ownership, cancellation, integration and troubleshooting.
- [Architecture decisions](adr): rationale and tradeoffs behind the implementation.
- [Benchmark methodology](../benchmarks/README.md): seeded workloads, raw samples and interpretation.
- [Compatibility and version policy](adr/0012-release-policy.md): verified versions and private release preparation.
- [Verification evidence](verification-candidate.md): scoped checks for the original private candidate.
- [Contributing](../CONTRIBUTING.md): workspace commands and review expectations.

The library is pre-1.0 and unpublished. Use the workspace or validated private tarballs. The Markdown guide is the source for the website; update it directly when changing behavior.
