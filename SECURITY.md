# Security reporting

Searchivo is pre-1.0. Only the current `develop` implementation is actively reviewed; no stable release support window is promised yet.

Do not put exploit details, credentials, private data or vulnerability demonstrations in a public issue. Use GitHub's **Security → Report a vulnerability** option if private reporting is enabled for this repository. If that option is unavailable, contact a maintainer through an existing private channel; a generic public issue asking for a private reporting route should contain no sensitive details. No dedicated security email or response-time guarantee is currently configured.

Include the source revision or package version, affected entry point, runtime, expected and observed behavior, impact, and a minimal synthetic reproduction. Redact tokens and personal data.

The HTTP and worker boundaries validate unknown payloads, but callers must provide appropriate document guards. Highlight helpers return text ranges; consumers must render text safely. Limits and ownership contracts are documented in the [guide](docs/guide.md).
