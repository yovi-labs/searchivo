# Public package preparation and separate websites

The owner requested that `searchivo.netlify.app` host the official landing page, documentation and playground, with a real application in another Netlify project. This supersedes the combined-site arrangement in ADR-0015. The official project publishes `dist/deploy/official` and has no HTTP fixture functions. Searchivo Market publishes `dist/deploy/example`, owns its fixtures and opens the catalog at `/`; the lab and minimal integration remain at `/#features` and `/#minimal`. Legacy official example hash bookmarks redirect to the application.

Market adds a complete product-discovery workflow: Searchivo retrieval/refinements, details in a native modal dialog, and a bounded saved-products list stored locally. Storage is validated and unavailable/corrupt storage fails gracefully. All data is explicitly fictional; there is no checkout or transactional commerce claim.

The owner will publish npm packages. All six library manifests are prepared at 0.1.0 with public scoped access and registry-compatible peers. The workspace and apps remain private. pnpm packing rewrites workspace dependencies; installed-tarball validation rejects any remaining local protocol and performs npm publish dry runs. The maintainer receives exact validated archives, hashes and a source ZIP from a clean commit. No publication command runs automatically.

The old private-candidate policy remains historical. The current [publishing guide](../publishing.md) defines release preparation and external npm account/scope prerequisites. Tested contracts and known algorithm/transport limitations remain documented; release readiness does not imply universal browser compatibility or an authenticated hosted search backend.
