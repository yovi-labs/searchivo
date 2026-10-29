# @searchivo/themes

Optional styles only. Import `@searchivo/themes/css` and add `searchivo-theme` to a container. Behavior and core packages work without this stylesheet. CSS variables customize the palette; keyboard focus and reduced-motion styles are included.

Sass consumers can use `@use 'pkg:@searchivo/themes/scss' as searchivo` with the Sass NodePackageImporter, then `@include searchivo.tokens($accent: #ff65b3)`. Themes do not supply HTML or JavaScript components.
