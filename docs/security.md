# Security and operational limits

Treat documents, network results and user queries as untrusted at application boundaries. Core operates on typed local data; it is not an authorization layer or a hardened public search server. [HTTP and worker reference](reference-integrations.md) · [security reporting policy](https://github.com/yovi-labs/searchivo/blob/develop/SECURITY.md).

## Render data as text

Highlight ranges are offsets, never HTML. Angular interpolation, DOM text nodes and `textContent` preserve untrusted text safely. Avoid `innerHTML`, dynamic template compilation and HTML trust-bypass functions. The docs build renders versioned repository Markdown; that is trusted developer content, not a public Markdown upload endpoint. Changing that trust model requires HTML sanitization and a restrictive content policy.

## Validate transport and bound resources

Workers validate envelopes and operation payloads plus caller-provided document guards. HTTP validates response envelopes, scores, IDs, counts and allowed facet fields. Guards must actually check the fields the application uses. Keep your backend authorization checks independent of search filters; a hidden UI control does not protect data.

Use input maxlength and server-side query/body limits. Fuzzy search has explicit query/token/traversal limits; exact indexing and matching have no universal document/token/count cap. A huge exact query, dictionary, batch, facet set or HTTP response can still consume memory and CPU. Set limits appropriate to the domain before handing untrusted input to these APIs. The live fixture accepts only POST JSON, at most 10,000 bytes and a 200-code-unit query; it searches four immutable fictional fixtures. The invalid endpoint deliberately produces a malformed envelope for testing.

## Cancellation and ownership

Abort invalidates replies and asynchronous state; it does not stop synchronous engine work, roll back writes or guarantee that an HTTP server stops computation. Always dispose controllers, pending debounce, suggestion cancellation and owned worker clients. Do not terminate a shared port owned by another component. State subscribers and pure ranking callbacks must not mutate the engine or throw unexpectedly.

## Data and deployment

Local core search sends no network telemetry. HTTP sends the full query/request to your selected endpoint; recorder summaries contain query text and can be sensitive even without documents. Do not collect or publish those summaries without application policy. Keep credentials outside source, browser output and Notion records. The live fixture requires no secret or external data source.

Static CDN responses use nosniff, a referrer policy and frame denial. Functions set their own JSON/no-store/nosniff headers; CDN header rules do not apply to them. No catch-all SPA rewrite turns missing JavaScript into HTML. A restrictive CSP needs deliberate Angular style policy and deployment testing; no claim of complete CSP protection is made here.

Run the dependency audit against the lockfile, inspect the final diff, and retain exact revision/test evidence. Audit results describe known advisories at that time, not a guarantee against every vulnerability. See [deployment](deployment.md) for repeatable verification.
