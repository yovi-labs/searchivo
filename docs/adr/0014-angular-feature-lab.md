# Angular integration feature lab

The owner requested an Angular app to exercise Searchivo features together. Extend the existing standalone, OnPush, zoneless example with a lazy `#features` view, while keeping the minimal directive view. Move the isolated tarball AOT consumer to examples/angular.ts so application integrations do not broaden its dependency contract.

The app combines core ranking, fuzzy/highlights, refinements, grouped suggestions and debounce with Angular Signals, worker transport, HTTP adapter, diagnostics and optional CSS. Worker and HTTP use independent fixed BM25 fixture indexes; local mutations and ranking controls remain local. Browser tests compare the default source results and verify malformed remote responses and noncooperative delayed-source races.

The preview server supplies a bounded loopback-only HTTP fixture endpoint. It is not a production backend. This app is a single-root demonstration; its source dispatch binding is owned by that root. DestroyRef disposes the recorder, worker, debounce and suggestion cancellation. The Angular provider owns its controller cleanup.

Browser coverage establishes integration behavior across feature families, while library tests retain exhaustive API edge cases. No additional compatibility or performance claim follows from the four-document demo.
