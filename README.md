# Searchivo

**Search that fits your Angular app.**

Add ranked search, typo tolerance, filters and suggestions to the interface you already own. Install Searchivo from npm, index your application's data, and render reactive results with Angular Signals.

[![Quality](https://github.com/yovi-labs/searchivo/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/yovi-labs/searchivo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-a6e3d4)](LICENSE)
[![Version: 0.1.0](https://img.shields.io/badge/version-0.1.0-ff65b3)](CHANGELOG.md)

[Official website](https://searchivo.netlify.app/) · [Documentation](https://searchivo.netlify.app/docs/) · [Angular quickstart](https://searchivo.netlify.app/docs/angular/) · [Try Searchivo Market](https://searchivo-market.netlify.app/)

## Why Searchivo?

- **Useful results:** field boosts, optional BM25 ranking and typo recovery help users find the right record.
- **An Angular fit:** readonly Signals, scoped providers and native input integration support OnPush and zoneless applications.
- **Your interface:** build filters, facets, sorting, pagination and suggestions with your own HTML and styles.
- **Local data, local search:** the zero-dependency core searches documents in your application without a hosted service. Index only data the current user is allowed to receive.
- **Small by default:** optional entry points keep additional capabilities out of the basic core bundle, measured at 1,248 gzip bytes.

## Install in your Angular application

```sh
npm install @searchivo/core@0.1.0 @searchivo/angular@0.1.0
```

> **Release availability:** 0.1.0 is awaiting npm publication. The command above becomes available when published. Angular integration is tested with Angular 22.2.3; see [compatibility](https://searchivo.netlify.app/docs/reference-angular/).

Install these dependencies in your own Angular project. Use the [installation guide](https://searchivo.netlify.app/docs/tutorial/) for the data model and the [Angular guide](https://searchivo.netlify.app/docs/angular/) for the full integration.

## A complete Angular example

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

Type **desk** to see the matching product. Add your own documents and choose the fields users should search. Give important fields a higher boost, then add filters or typo tolerance when your application needs them.

## See the search experience

[Searchivo Market](https://searchivo-market.netlify.app/) is a separate Angular application using the library: search 10,000 fictional products, refine by category, brand or price, sort, open details and save favorites. It demonstrates a complete product-discovery interface; products and prices are fictional and there is no checkout.

[Interactive playground](https://searchivo.netlify.app/playground/) lets you compare search settings before integrating them. [Examples](https://searchivo.netlify.app/examples/) show how the same APIs fit different use cases.

## Choose the packages you need

| Package                                              | Use it for                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`@searchivo/core`](packages/core/README.md)         | Typed indexing, relevance and optional fuzzy search, highlights, refinements and suggestions. |
| [`@searchivo/angular`](packages/angular/README.md)   | Angular Signals, component-scoped state and a native input directive.                         |
| [`@searchivo/themes`](packages/themes/README.md)     | Optional scoped CSS and Sass tokens for your interface.                                       |
| [`@searchivo/adapters`](packages/adapters/README.md) | Optional validated HTTP sources when your application searches through a backend.             |
| [`@searchivo/workers`](packages/workers/README.md)   | Optional background execution when measurements show main-thread work is too expensive.       |
| [`@searchivo/devtools`](packages/devtools/README.md) | Optional local state diagnostics during development.                                          |

## Learn and build

[Getting started](https://searchivo.netlify.app/docs/tutorial/) · [Concepts](https://searchivo.netlify.app/docs/guide/) · [Angular integration](https://searchivo.netlify.app/docs/angular/) · [API reference](https://searchivo.netlify.app/api/) · [Performance evidence](https://searchivo.netlify.app/benchmarks/)

Searchivo is pre-1.0. Queries use token OR matching without stemming; empty queries return no hits. Document snapshots are shallow, fuzzy matching has explicit work limits, and filters run after ranking. The [documentation](https://searchivo.netlify.app/docs/) explains these tradeoffs and how to design around them.

## Contribute

For a proposed change, fork the repository, create a branch from `develop`, and open a pull request targeting `develop`. [Contributor setup and quality checks](CONTRIBUTING.md) are separate from installing the library.

Searchivo is [MIT licensed](LICENSE). Preserve the copyright and license notices when redistributing copies or substantial portions. [Security reporting](SECURITY.md) · [Changelog](CHANGELOG.md).
