# Publishing Searchivo 0.1.0

This repository prepares six public npm packages at synchronized version **0.1.0**. The root workspace and all applications remain private. Package builds, validation and release preparation do not publish anything. The maintainer performs publication with their own npm credentials and permission for the `@searchivo` scope.

## Verify and create exact release artifacts

Use Node 24.22.1 and pnpm 11.28.9. Start from a reviewed, clean commit with passing CI:

```sh
pnpm install --frozen-lockfile
pnpm release:check
pnpm release:prepare
```

`release:check` runs formatting, lint, strict builds, library tests/coverage, package boundaries, installed-tarball consumers, all complete documentation examples, browser/axe checks, endpoint tests and the dependency audit. Package validation packs using pnpm so `workspace:*` references become registry versions, rejects local dependency protocols in every packed manifest, validates exports and file allowlists, and runs **npm publish --dry-run** for all six archives. No registry write occurs.

`release:prepare` requires a clean tree and a packed-validation receipt from that same commit. It copies the validated archives into `artifacts/release-0.1.0-<commit>/`, checks SHA-256 hashes, and creates a source ZIP plus manifest. Old private candidate artifacts keep their original contents and names. Publish the new validated tarballs, not old candidates or arbitrary source directories. In particular, Angular publishes its built APF package, not `packages/angular` source.

## Confirm npm account and scope

```sh
npm login
npm whoami
npm org ls searchivo
npm view @searchivo/core versions --json
```

The account needs publishing rights for the `@searchivo` organization/scope, including any required 2FA or trusted-publishing policy. A package lookup returning 404 does not prove the scope is available or that your account owns it. If the intended namespace differs, update every manifest, peer, import, example and document together and rerun validation. Never store npm tokens in Git, website assets or Notion.

In this delivery's environment, `npm whoami` returned **401 Unauthorized**. Authentication and scope ownership therefore remain maintainer-side publication prerequisites; no attempt was made to publish.

## Publish in dependency order

Run these commands **from the generated release directory** after checking its manifest and hashes. These are manual publishing instructions, not commands run by the build:

```sh
npm publish searchivo-core-0.1.0.tgz --access public
npm publish searchivo-angular-0.1.0.tgz --access public
npm publish searchivo-workers-0.1.0.tgz --access public
npm publish searchivo-adapters-0.1.0.tgz --access public
npm publish searchivo-devtools-0.1.0.tgz --access public
npm publish searchivo-themes-0.1.0.tgz --access public
```

Wait until core 0.1.0 resolves from the registry before installing integrations that peer on it. Match your organization's authentication/2FA requirements. Public scoped access is also recorded in each package's `publishConfig`. npm versions are immutable; if a published artifact is wrong, fix forward with a new synchronized version rather than reusing 0.1.0.

## Verify the registry consumers

After publication, verify each package's version, access, exports, peers, tarball integrity and provenance when configured. In a clean project install `@searchivo/core@0.1.0`, run the [first-search example](tutorial.md), then install the optional integration you need. Validate Angular in a 22.2.3 application with strict AOT, and CSS/Sass using their documented subpaths. Update the official site's availability message only after confirming the registry versions.

The website and [Market application](https://searchivo-market.netlify.app/) deploy independently of npm. Their working workspace builds do not imply the packages are already on the registry. No public release, npm publication or merge to main is performed automatically.
