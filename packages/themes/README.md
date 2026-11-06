# @searchivo/themes

Optional styles only. Import `@searchivo/themes/css` and add `searchivo-theme` to a container. Behavior and core packages work without this stylesheet. CSS variables customize the palette; keyboard focus and reduced-motion styles are included.

Sass consumers can use `@use 'pkg:@searchivo/themes/scss' as searchivo` with the Sass NodePackageImporter, then `@include searchivo.tokens($accent: #ff65b3)`. Themes do not supply HTML or JavaScript components.

## Installation and reference

After version 0.1.0 is published, install with `npm install @searchivo/themes@0.1.0`. Before publication, use the validated release tarball. The workspace/application builds do not publish to npm.

[Full API reference and examples](https://searchivo.netlify.app/docs/reference-integrations/) · [Official website](https://searchivo.netlify.app/) · [Working Angular application](https://searchivo-market.netlify.app/) · [Publishing guide](https://searchivo.netlify.app/docs/publishing/)
