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
  { id: 1, name: "Apple iPhone" },
  { id: 2, name: "Google Pixel" },
  { id: 3, name: "Samsung Galaxy" },
]);
const search = createSearchivo(localSource(engine));
@Component({
  selector: "app-root",
  standalone: true,
  imports: [SearchivoInputDirective],
  providers: search.provide(),
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main>
    <h1>Searchivo Angular</h1>
    <p>Demo fixtures — three products, not a benchmark.</p>
    <label for="search">Search products</label
    ><input id="search" searchivo type="search" aria-describedby="help" />
    <p id="help">Try iPhone, Pixel or Galaxy.</p>
    <p role="status">{{ search.state().total }} results</p>
    <ul>
      @for (hit of search.state().results; track hit.id) {
        <li>{{ hit.document.name }}</li>
      }
    </ul>
    <button type="button" (click)="search.setQuery('Pixel')">
      Search Pixel
    </button>
  </main>`,
})
class App {
  readonly search = search.inject();
}
void bootstrapApplication(App, {
  providers: [provideZonelessChangeDetection()],
});
