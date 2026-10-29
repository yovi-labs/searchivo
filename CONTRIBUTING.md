# Contributing to Searchivo

Thanks for helping make search simpler to integrate and easier to understand. The active implementation branch is `develop`. Packages are currently private, pre-1.0 candidates.

## Set up the workspace

Use Node 24.22.1 and pnpm 11.28.9, matching CI. Run `pnpm install --frozen-lockfile`, then `pnpm build`. The repository uses pnpm workspaces and native TypeScript project references.

| Task                               | Command                                     |
| ---------------------------------- | ------------------------------------------- |
| Complete library/package gate      | `pnpm check`                                |
| Format source                      | `pnpm format`                               |
| Library tests and coverage         | `pnpm test`                                 |
| Build docs/playground              | `pnpm build:website`                        |
| Preview the built website          | `pnpm preview:website`                      |
| Build Angular and worker examples  | `pnpm build:example`                        |
| Install browser for tests          | `pnpm exec playwright install chromium`     |
| Browser behavior and accessibility | `pnpm test:browser`                         |
| Dependency audit                   | `pnpm audit --audit-level=low`              |
| Engine / worker measurements       | `pnpm benchmark` / `pnpm benchmark:workers` |

Build both the website and examples before running browser tests. On Linux, Playwright may require system dependencies; CI uses `playwright install --with-deps chromium`.

## Make a focused change

1. Describe the observable problem and expected result in an issue. For substantial changes, explain the proposed contract before adding abstractions.
2. Branch from `develop` using a descriptive name; Codex-authored branches use `codex/`.
3. Keep core platform-independent. Framework and platform integrations may depend on core, never the reverse.
4. Add behavior or invariant tests for changed library behavior. Preserve strict types and per-file 100% coverage without broad exclusions.
5. Update the guide, examples and changelog when public behavior changes. Record consequential tradeoffs in `docs/adr`.
6. Run affected checks and the full gate before requesting review. UI changes need browser verification, including keyboard use and mobile layout.
7. Open a pull request targeting `develop`, explaining the problem, resulting behavior, validation and remaining limitations.

Do not include credentials, `.env` files, dependencies, build caches or generated candidate archives in commits. Fixtures should be synthetic and reproducible. Do not upload proprietary customer datasets in bug reports.

## Repository map

`packages/` contains published-shape library sources. `apps/` contains the website, playground and Angular example. `examples/` contains executable consumers. `scripts/` implements packaging, site generation and verification. `benchmarks/` holds seeded workloads and raw reports. `docs/guide.md` is rendered into the website; `docs/README.md` is the GitHub documentation entry point.

## Review principles

Prefer small APIs, explicit ownership and measured changes. Preserve raw performance samples and report the environment. Do not adjust budgets or rewrite baselines merely to make checks pass. Explain cancellation, mutations and allocation tradeoffs where they matter.

Be respectful and specific in discussions. Critique the work, explain your reasoning and make room for differing experience levels. Maintainers may close abusive or unrelated discussions.

## Release boundary

Use the [private release policy](docs/adr/0012-release-policy.md). Candidate preparation is separate from npm publication, a public release, deployment or a merge to `main`. Those operations require owner approval. Never republish an old version with changed package contents.
