# Deployment and troubleshooting

The owner selected **Netlify** for this delivery. One project serves the actual Angular app at `/`, the catalog at `/#catalog`, feature lab at `/#features`, documentation at `/docs/`, the original toolkit homepage at `/website/`, and playground/reference/examples/benchmarks at their existing paths. Hash navigation bootstraps a fresh Angular scope. Direct navigation and refresh use `/` naturally and require no SPA rewrite.

## Reproduce the production output

Use repository root as the working/base directory. Node 24.22.1 and pnpm 11.28.9 match `.node-version`, `packageManager` and CI. Install with `pnpm install --frozen-lockfile`, build with `pnpm build:deploy`, publish `dist/deploy`. The command builds all libraries, the AOT Angular app and module workers, then static documentation, then assembles the output. `netlify.toml` records these settings and `netlify/functions` uses esbuild bundling. Dependencies install from the committed lockfile. Link state under `.netlify` is local and ignored.

The HTTP functions import the built fixture module; deploy only after the Angular build has generated it. `/api/search` is a read-only four-product behavior fixture; refinements remain in the feature lab. `/api/invalid` intentionally exercises response validation failure. The catalog indexes all 10,000 fictional products in the browser and uses no remote catalog backend.

`revision.json` records `COMMIT_REF` during a hosted Git build or local Git HEAD during a manual build. It contains no credentials. Match that revision to the pushed commit and CI before describing a deployment as final. Local source must be clean when making an exact-revision claim. Manual production deploys on Git-connected sites are replaced by the next production-branch build; keep that in mind when choosing deployment workflow.

## Verification checklist

Run `pnpm check`, `pnpm build:deploy`, `pnpm test:endpoints`, `pnpm test:browser`, `pnpm audit --audit-level=low`, `pnpm benchmark`, `pnpm benchmark:workers` and `pnpm benchmark:catalog`. Check `/`, `/#features`, `/#catalog`, `/docs/`, `/api/` and `/playground/` in the deployed browser, including refresh and navigation. Confirm no missing lazy chunk, worker, stylesheet or MIME errors. Compare `/revision.json` to the final pushed commit.

For a deployed smoke run, set `SEARCHIVO_APP_URL` and `SEARCHIVO_DOCS_URL` to the same HTTPS origin and run `pnpm test:browser`; test configuration omits local servers in that mode. Tests cover keyboard, simulated composition, async states and axe checks at selected desktop/mobile sizes. They do not establish support for all browsers, physical IMEs, assistive technologies or devices.

## Common failures

| Symptom                           | Check and fix                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No results                        | Searchable fields must be strings; verify exact tokens, accents and OR behavior. Empty queries are not browsing unless your source makes them so. |
| Duplicate ID                      | `add` rejects existing IDs; use full-document `upsert` for replacement.                                                                           |
| Stale nested values               | Snapshots are shallow; copy/freeze nested application data if needed.                                                                             |
| Slow first fuzzy/suggestion query | Cache the helper closure; it rebuilds its derived dictionary after mutations. Heavy indexes may belong in a Worker.                               |
| Angular injection error           | Import the directive and provide the **same binding** in the consumer's scope; inject only in injection context.                                  |
| Filters disappear                 | `setQuery` is query-only; use controller.search with explicit refinements.                                                                        |
| Worker hangs                      | Verify worker URL/MIME, runtime attachment, ready handshake and document guard. Add an application startup timeout.                               |
| HTTP lab fails                    | Deploy functions with the static output. Inspect JSON content/status and validation; invalid-http is intentionally an error.                      |
| Cancellation still uses CPU       | Abort abandons replies; it does not interrupt synchronous computation.                                                                            |
| Old page after edits              | This is a production build; rebuild both app/docs and check revision.json.                                                                        |
| Missing chunk returns HTML        | Remove inappropriate catch-all rewrites; preserve real asset paths and rebuild the complete output.                                               |

## Compatibility and migration

This delivery preserves public signatures and package boundaries. Empty-token highlights now return immediately with the same `[]` result. Feature-lab helper instances reuse their derived indexes and reset when the engine is rebuilt. Public documentation links move from localhost to HTTPS. Local commands remain available. Packages remain unpublished and pre-1.0; no npm publication, public release or merge to main is part of this delivery. Historical candidate ZIPs and measurements retain their original revisions.
