# Deployment and troubleshooting

The official [Searchivo website](https://searchivo.netlify.app/) and [Searchivo Market](https://searchivo-market.netlify.app/) deploy to two independent Netlify projects.

| Project          | Content                                             | Build command       | Publish directory    | Functions         |
| ---------------- | --------------------------------------------------- | ------------------- | -------------------- | ----------------- |
| searchivo        | Landing, docs, playground, API and benchmark pages  | pnpm build:official | dist/deploy/official | None              |
| searchivo-market | Angular Market, feature lab and minimal integration | pnpm build:market   | dist/deploy/example  | netlify/functions |

Both use repository root as the base directory, Node 24.22.1, pnpm 11.28.9, and a frozen-lockfile install. Root netlify.toml configures the official site. apps/angular-example/netlify.toml configures Market with the same repository root. The root build:deploy command builds both outputs for local verification.

## URLs and compatibility

Official landing is `/`; documentation `/docs/`; playground `/playground/`; API reference `/api/`; examples `/examples/`; benchmarks `/benchmarks/`. The old `/website/` path redirects to `/`. Old official `/#catalog`, `/#features` and `/#minimal` bookmarks redirect to the corresponding Market view.

Market opens the catalog at `/`, also accepts `/#catalog`, and serves the integration lab at `/#features` and minimal example at `/#minimal`. Hash navigation starts a fresh Angular scope and supports direct navigation/refresh. No catch-all rewrite turns missing scripts into HTML.

## Build and deploy

```sh
pnpm install --frozen-lockfile
pnpm build:deploy
pnpm test:endpoints
pnpm test:browser
```

For manual production uploads with the authenticated Netlify CLI, explicitly select the project and directory:

```sh
npx netlify-cli@27.16.2 deploy --site searchivo --filter @searchivo/website --dir dist/deploy/official --functions netlify/official-functions --no-build --prod
npx netlify-cli@27.16.2 deploy --site searchivo-market --filter @searchivo/angular-example --dir dist/deploy/example --functions netlify/functions --no-build --skip-functions-cache --prod
```

Set AWS_LAMBDA_JS_RUNTIME=nodejs24.x in the deploying shell for Market functions and verify the reported runtime after deployment. This is a nonsecret runtime selector. Functions must be bundled after the Angular build generates the fixture module. Local link state stays under ignored `.netlify` directories; explicit site IDs prevent accidental uploads to the other project. Manual deployment does not configure automatic Git deploys. On a Git-connected project, the next production-branch build replaces a manual upload.

Both outputs include revision.json with source commit, site name and package version. Compare the source revision with passing CI before declaring the deployment final. The official project must contain no Angular fixture functions or feature-worker asset; endpoint/deployment regression tests enforce the output separation. Check actual deployment metadata as well as static files.

## Market UI and fixture boundaries

Market uses real Searchivo indexing, BM25 retrieval, fuzzy fallback and typed refinements for all 10,000 fictional products. Product details use a native dialog with Escape and focus return. Saved products persist up to 100 validated IDs locally; corrupt/unavailable browser storage falls back gracefully. There is no purchase or checkout flow.

The lab's `/api/search` searches four read-only fictional fixtures and returns matching hits; lab refinements run locally. `/api/invalid` intentionally demonstrates validation failure. These functions belong only to Market, never the official site. Neither is a general authenticated search backend.

## Verify locally and publicly

For local previews, run `pnpm preview:website` on port 4174 and `node scripts/serve.mjs dist/deploy/example 4173` for Market. The browser suite uses isolated ports 4183/4184. For public checks set SEARCHIVO_APP_URL=https://searchivo-market.netlify.app and SEARCHIVO_DOCS_URL=https://searchivo.netlify.app, then run pnpm test:browser. Check both revision files, HTTP/worker paths, missing-asset 404s, docs links, SEO canonical/sitemap and all three Angular views. Automated Chromium/axe/simulated-IME checks do not prove compatibility with every device or assistive technology.

## Common failures

| Symptom                     | Check and fix                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| Wrong project at the domain | Use the explicit site ID and its dedicated publish/functions directory.                                |
| No results                  | Verify searchable string fields, exact tokens and accents; empty-query browsing is application policy. |
| Duplicate ID                | Use upsert for a complete replacement; add rejects duplicates.                                         |
| Slow first optional query   | Keep fuzzy/autocomplete closures; dictionaries rebuild after mutations.                                |
| Angular injection error     | Provide and inject the same binding in the intended component scope.                                   |
| Filters disappear           | setQuery is query-only; controller.search accepts explicit refinements.                                |
| Worker hangs                | Verify module URL/MIME, attachment, document guard, ready handshake and application timeout.           |
| HTTP lab fails              | Deploy functions to Market and inspect JSON status/validation; invalid-http is intentionally an error. |
| Old results after cancel    | Abort abandons replies; it does not stop synchronous CPU work.                                         |
| Saved list resets           | Browser storage may be blocked; session-only saving still works.                                       |
| Missing chunk returns HTML  | Remove catch-all rewrites and deploy the full clean output.                                            |

## npm release

Deployment does not publish packages. The [publishing guide](publishing.md) describes the 0.1.0 release bundle, six public tarballs, dry runs and required maintainer account/scope access. Historical private candidate ZIPs and measurements retain their original versions and revisions.
