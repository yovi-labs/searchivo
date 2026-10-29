# Website and optional themes

The documentation website is static ESM with six routes and a lazy TypeScript playground. It imports actual workspace packages. The sample data contains 12 labeled synthetic product fixtures; benchmarks use independent seeded datasets.

Worker mode sends ranking to a real module Worker. Fuzzy expansion, refinements and optional explanations remain local and are labeled accordingly. Explanation capture is intentionally opt-in. Numeric controls validate before rebuilding an engine. Result text uses text nodes and highlight ranges.

CSS and Sass are optional package exports, tested from installed tarballs. Browser checks exercise keyboard selection, IME in the Angular example, filters, pagination, safe rendering, worker parity, responsive overflow and axe. These checks do not establish field Core Web Vitals or universal accessibility.

Build with `pnpm build:website`; preview using `node scripts/serve.mjs dist/website 4174`. Deployment is a separate action.
