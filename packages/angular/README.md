# @searchivo/angular

Private Angular 22.2.3 integration. Core remains usable without Angular or RxJS.

Create a binding with `createSearchivo(localSource(engine))`. Add `binding.provide()` to a standalone component's providers and `SearchivoInputDirective` to its imports. Retrieve the typed handle using `binding.inject()` in an injection context.

Use `<label for="products">Search products</label><input id="products" searchivo>` in that scope. `search.state()` is a readonly Signal containing query, results, total, facets, loading, error and duration. `search.setQuery(value)` synchronizes the native input. For filters/pagination use `search.controller.search(request)`.

Each provider scope owns its controller, and DestroyRef disposes it. IME input is committed on compositionend. The directive supplies no styles and does not invent autocomplete ARIA roles without a popup. See apps/angular-example for the runnable zoneless OnPush example with strict AOT and browser checks. Prefix suggestion popup behavior belongs to a consumer; this example demonstrates native search, not a combobox.
