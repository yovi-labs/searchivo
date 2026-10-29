# Private candidate release policy

All six packages use the synchronized semantic prerelease version `0.1.0-rebuild.0`. A single root changelog is the justified equivalent of Changesets for this initial, unpublished candidate: there are no independent stable release trains or automatic publication workflows. Each future candidate must update that changelog and all affected versions together. Before 1.0, breaking API changes require a minor version and explicit migration notes; stable releases follow semantic versioning.

MIT is selected for the requested open-source toolkit. Package manifests identify the repository and ship the license. `private: true` remains on every package. No publishing or deployment command is part of candidate preparation.

Candidate preparation requires a clean Git checkout and a successful packed-consumer receipt from that exact revision. It verifies all six tarball hashes before generating the SHA-256 manifest and a tracked-files-only source ZIP. The ZIP must be independently extracted and compared with Git blobs before handoff. Artifacts remain local and ignored; the manifest identifies the source revision without a self-referential commit hash.

Compatibility is verified only for Node 24.22.1, TypeScript 6.0.3, Angular 22.2.3 and the installed Playwright Chromium. Core is ES2022 ESM without DOM/Node ambient types; optional highlighting requires Intl.Segmenter. Other browser/framework/runtime combinations are not certified.

Timing reports remain environment-specific evidence. CI enforces semantic tests, bounded fuzzy work, full library coverage and the fixed 5KB core gzip budget. It does not use unstable cross-machine latency thresholds.
