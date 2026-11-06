# Recipe: standalone Angular search

Add ranked search to an existing standalone Angular component while keeping your own HTML and styles. Searchivo connects a native input to readonly Signals, so results update with OnPush and zoneless change detection.

## Install in your application

```sh
npm install @searchivo/core@0.1.0 @searchivo/angular@0.1.0
```

See [release availability and compatibility](tutorial.md#1-install-with-npm). The [live Angular example](https://searchivo-market.netlify.app/#minimal) shows the result without any setup.

## A complete standalone component

The engine selects the searchable fields. `localSource` connects it to Searchivo's state controller. The Angular binding provides that controller to this component, and `searchivo` connects the input to it.

```typescript
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { createSearchEngine } from "@searchivo/core";
import { localSource } from "@searchivo/core/source";
import { createSearchivo, SearchivoInputDirective } from "@searchivo/angular";

const engine = createSearchEngine({ id: "id", fields: { name: {} } }, [
  { id: 1, name: "Desk lamp" },
]);
const binding = createSearchivo(localSource(engine));
@Component({
  selector: "app-root",
  standalone: true,
  imports: [SearchivoInputDirective],
  providers: binding.provide(),
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<label for="query">Search products</label>
    <input id="query" searchivo type="search" />
    <p role="status">
      {{
        search.state().loading
          ? "Searching…"
          : search.state().total + " results"
      }}
    </p>
    @if (search.state().error) {
      <p role="alert">Search failed. Try again.</p>
    }
    @for (hit of search.state().results; track hit.id) {
      <p>{{ hit.document.name }}</p>
    }`,
})
class App {
  readonly search = binding.inject();
}
void bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
```

## Scope, Signals and cleanup

| Step                                   | What it does for your application                                 |
| -------------------------------------- | ----------------------------------------------------------------- |
| `createSearchivo(localSource(engine))` | Creates a typed binding for this search domain.                   |
| `providers: binding.provide()`         | Gives each component instance its own search state.               |
| `imports: [SearchivoInputDirective]`   | Enables `searchivo` on a normal input.                            |
| `binding.inject()`                     | Exposes reactive results, loading, errors and a query controller. |

Type `desk` into the example: the state contains one result, and Angular renders **Desk lamp**. Clear the input: the result list becomes empty. Decide in your component whether an empty query should show your full catalog instead.

Create the binding once, then call `provide()` in component providers. Each component instance receives an independent controller; a shared source engine still shares indexed data. Call `binding.inject()` in an Angular injection context, such as a field initializer. Missing providers cause an injection error. Signals are readonly to consumers; use `setQuery` or the controller to change state. Signal updates make the example work with OnPush and without Zone.js. `DestroyRef` unsubscribes and disposes the scoped controller.

For filters and pagination call `search.controller.search({ query, filters, offset, limit })`; `setQuery` is a convenience for a query-only request. Keep a separate input Signal when typing should update immediately while searching is debounced. Provide `SEARCHIVO_INPUT` with a `SearchivoInput` binding to route the native directive through that policy. The [catalog source](https://github.com/yovi-labs/searchivo/blob/develop/apps/angular-example/src/catalog.ts) does this with 120 ms debounce and `DestroyRef` cleanup. It renders only 24 cards and tracks stable IDs. The [feature lab source](https://github.com/yovi-labs/searchivo/blob/develop/apps/angular-example/src/features.ts) includes groups, mutations, cancellation, workers and HTTP.

## Native input and IME

`<input searchivo>` keeps native labels, keyboard behavior and caller markup. It ignores unfinished composing input, commits on `compositionend`, and synchronizes programmatic changes when composition is inactive. Cancel pending debounce on `compositionstart`, as the catalog does, so previously typed work cannot commit during composition. Browser tests dispatch composition events; physical IME/device combinations remain a manual compatibility check.

The directive is not an autocomplete popup. Add combobox roles only when you supply a popup, active-option tracking and keyboard interactions. The catalog uses ordinary suggestion buttons reachable by Tab. The playground demonstrates a separate keyboard combobox. Do not use Angular HTML trust bypass for document highlights.
