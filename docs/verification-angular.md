# Angular rebuild verification

Tested on Windows, Node 24.22.1, TypeScript 6.0.3, Angular 22.2.3 and ng-packagr 22.2.5. No broader compatibility claim is made.

- 34 library tests pass with 100% statements, branches, functions and lines across all core/Angular source.
- Provider scoping, Signals, native-input synchronization, IME, async stale-result suppression and disposal/cancellation are exercised.
- Angular package format tarball installs in an isolated temporary consumer and compiles the real example with strict AOT templates. The standalone application also builds and links for production.
- Two Chromium checks exercise native keyboard/focus, programmatic query updates and IME. Axe finds no violations in the tested example state.
- Dependency audit initially failed with six Vite 8.3.0 advisories after Angular tooling was installed. A pinned Vite 8.3.5 override resolves the audit without exclusions.

The browser runner inherits conflicting NO_COLOR/FORCE_COLOR environment settings and reports a color-output warning; this does not affect test outcomes. The example demonstrates native search, not a suggestion combobox; a full keyboard-driven suggestion example remains for the website milestone. Measurements and tests are new rebuild evidence, not historical results.
