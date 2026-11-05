# Combined Angular and documentation deployment

The owner requested deployment of the actual Angular application and documentation, then selected Netlify as the hosting target. The application, documentation and fixture functions ship atomically in one project. Angular owns `/`, `/#catalog` and `/#features`; static documentation keeps `/docs/`, API reference keeps `/api/`, and the previous toolkit homepage moves to `/website/`. Playground, examples and benchmark paths remain available. The public fixture functions own only `/api/search` and `/api/invalid`.

The root `netlify.toml` pins the workspace runtime/build/publish configuration. `pnpm build:deploy` builds libraries, strict AOT Angular output, module workers, static documentation and then the combined directory. The assembler clears only generated deployment output. The website also clears its generated output so obsolete chunks cannot accumulate. No catch-all rewrite disguises missing scripts as HTML; hash navigation requires no server routing. Revision metadata allows comparison with Git and CI.

The initial delivery uses the authenticated CLI to upload a verified build because the connected Netlify tools create/configure/inspect projects but do not upload local deployment files. The CLI targets the same connector-created project explicitly. Git CI remains separate from manual Netlify deployment, and future source pushes do not automatically replace this site. No deployment credential or local link state is committed.

The four-document HTTP fixture is shared between production functions and the local preview. It accepts bounded POST JSON and intentionally malformed responses only on the explicit invalid endpoint. Ranking fixtures are immutable; refinements remain in the lab. It is not a production catalog search server. The 10,000-product catalog stays local and fictional.

Public API signatures and optional package boundaries are preserved. This delivery changes no package publication status and does not merge to main. The [delivery evidence](../verification-delivery.md) records checks and limitations.
