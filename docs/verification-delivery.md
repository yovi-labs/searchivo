# Angular and documentation delivery verification

This delivery uses Netlify at the owner's request. One project serves the actual Angular app at [the root](https://searchivo.netlify.app/), [catalog](https://searchivo.netlify.app/#catalog), [feature lab](https://searchivo.netlify.app/#features) and [documentation](https://searchivo.netlify.app/docs/). The original toolkit homepage is at `/website/`. This is a source-built manual deployment; Git pushes run quality CI but do not currently auto-deploy Netlify.

## Evidence and scope

| Check                                                          | Observed result                                                                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting, ESLint, strict library types and Angular APF build | Pass through `pnpm check`                                                                                                                                        |
| Library tests                                                  | 48 passed; per-file 100% statements, branches, functions and lines                                                                                               |
| Dependency directions and no-any boundaries                    | Pass; core remains framework-independent                                                                                                                         |
| Installed-tarball consumers                                    | All six packages pass; strict Angular AOT, real HTTP round trip, worker protocol, CSS/Sass                                                                       |
| Complete Markdown examples                                     | 11 compile; ten execute in Node, one Angular example compiles with strict AOT                                                                                    |
| Basic core consumer bundle                                     | 2,564 raw / 1,248 gzip / 1,111 Brotli bytes; unchanged and within 5,000-byte gzip budget                                                                         |
| Angular application                                            | Initial 140.67 kB raw / 44.42 kB estimated transfer; catalog and lab are lazy chunks                                                                             |
| Static website links                                           | 446 internal page, anchor and asset links pass                                                                                                                   |
| Endpoint regressions                                           | Two Node tests exercise production function entries: real search, intentional invalid envelope, methods, media type, malformed queries, UTF-8 byte/stream limits |
| Browser suite                                                  | 21 pass locally and against the public Netlify review build; real Chromium, selected desktop/mobile layouts and axe scans                                        |
| Lockfile audit                                                 | No known vulnerabilities at verification time                                                                                                                    |
| Performance                                                    | Fresh full 1k/10k/100k engine and worker reports plus actual 10k-catalog before/after samples                                                                    |

The full browser suite checks native keyboard/programmatic input, simulated IME composition, debounce, mutations, derived-index invalidation, facets, filters, sorting, pagination, fuzzy fallback, loading/empty/error/cancellation/stale-response states, worker and HTTP parity, docs search/copy, direct navigation, refresh and assets. A public-network run exposed the playground's early-interaction race; a regression now holds its lazy chunk, verifies disabled controls until attachment, and checks the recoverable failed-load state.

## Measured change

On the recorded Node 24.22.1 / Ryzen 7 9700X machine, 24-name empty-query highlight median falls from 0.2851 to 0.0034 ms, about 98.8%. This is a helper workload, not an application-wide speedup. Exact retrieval and retained index heap are essentially unchanged. [Performance analysis](performance.md) includes raw report links, complexity, assumptions and tradeoffs. Before/after reports identify parent revision `c5fb9e6fa376db186b4148ab3ec135c92a6210e3` and dirty state; they do not pretend to be clean final-commit measurements.

## Revision and delivery checks

The [quality workflow](https://github.com/yovi-labs/searchivo/actions/workflows/ci.yml) runs on the pushed revision. `/revision.json` identifies the build source revision. Final handoff and the linked Notion delivery record report the exact pushed commit, completed CI run and final deployment after those checks finish. Build/deploy logs, package receipts and browser screenshots remain under ignored `artifacts` locally. Historical private-candidate manifests are unchanged.

## Compatibility and limits

Public signatures, package versions and optional import boundaries are preserved. Empty highlights still return `[]`. No migration is required. The HTTP function is a bounded four-product fictional fixture, with client-side refinements in the lab; it is not a general authenticated search service. All 10,000 catalog products are fictional and indexed locally.

Verified platform: Node 24.22.1, TypeScript 6.0.3, Angular 22.2.3 and Chromium. Physical IMEs, all assistive technologies, other browsers and real mobile devices were not exhaustively tested. Axe scans are automated checks on selected examples, not a universal accessibility certification. No field Core Web Vitals claim is made.

Known library limits remain: shallow snapshots; OR whole-token matching without stemming; bounded fuzzy expansion may truncate; ranking precedes filters; first optional dictionary construction can be expensive; catalog initialization uses the main thread; abort abandons replies without interrupting synchronous CPU work. HTTP guards/limits remain application responsibilities beyond validated envelopes. No npm package, public release or merge to main is included.
