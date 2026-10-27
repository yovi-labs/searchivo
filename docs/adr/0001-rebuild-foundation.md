# R-ADR-001: Persistent lightweight foundation

Accepted 2026-10-27. This is newly written source; historical results are not evidence for it.

Use pnpm workspaces and native TypeScript project references. TypeScript provides incremental local build caching and project isolation. Nx supplies a richer task graph and remote caching but adds configuration and dependencies before there is a measured build bottleneck. Reconsider when CI timings demonstrate a need. Explicit package exports, ambient-free core compilation and a boundary check will enforce dependency direction. Vitest provides behavioral tests and per-file 100% coverage on every library source file. Private packages block accidental publication; release candidates will be packed and validated locally.

Only core is justified initially. Add Angular/workers/adapters/devtools/themes at their vertical milestones. No Angular or RxJS runtime dependency enters core.

Registry metadata on 2026-10-27 reports Angular 22.2.3 requiring TypeScript >=6.0 <6.1. Pin TypeScript 6.0.3, Node 24.22.1, pnpm 11.28.9 and Vitest 4.1.12. Angular's [compatibility documentation](https://angular.dev/reference/versions) lists Node ^24.15.0 and TypeScript >=6.0 <6.1 for Angular 22. Actual Angular compatibility remains untested until its milestone.

Notion is the tracker, not a repository TODO. Full requested CI coverage will be added alongside the corresponding implemented subsystems; the initial workflow must not imply later checks already exist.
