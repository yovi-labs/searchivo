# R-ADR-007: Scoped Angular Signals and native inputs

Use Angular 22.2.3, ng-packagr 22.2.5, TypeScript 6.0.3 and Node 24.22.1. Registry peers and official Angular compatibility documentation were checked before implementation. Actual compatibility is limited to exercised builds/tests.

createSearchivo(source) owns a typed InjectionToken, provide() creates scoped controllers, and inject() retrieves Signals/controller. Each provider scope owns disposal through DestroyRef. The directive uses an input-only port via useExisting so document types never need erasure to any. It synchronizes programmatic query changes and suppresses input updates during IME composition. The directive intentionally does not invent combobox/listbox semantics without a corresponding suggestion popup.

The standalone example is OnPush and explicitly zoneless. It uses native labels and search input, announces result count, preserves focus and safely renders interpolated text. APF partial compilation belongs to ng-packagr, followed by strict AOT application compilation/linking. Core remains framework-independent.
