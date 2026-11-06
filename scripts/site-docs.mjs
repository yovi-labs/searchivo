import { readFileSync } from "node:fs";
import { marked } from "marked";
import ts from "typescript";
import { resolve } from "node:path";

export const documentation = [
  ["Start here", "tutorial", "Install and build your first search"],
  ["Concepts", "guide", "Engine and integration concepts"],
  ["Recipes", "angular", "Standalone Angular"],
  ["Recipes", "recipes", "Async search and HTTP"],
  ["Reference", "reference-core", "Engine, ranking and highlights"],
  ["Reference", "reference-interaction", "Refinements, suggestions and state"],
  ["Reference", "reference-angular", "Angular API"],
  ["Advanced", "reference-integrations", "Workers, HTTP and diagnostics"],
  ["Reference", "public-api", "Public export inventory"],
  ["Production", "performance", "Performance and complexity"],
  ["Production", "security", "Security and resource limits"],
].map(([group, id, title]) => ({
  group,
  id,
  title,
  text: readFileSync(`docs/${id}.md`, "utf8"),
  url: `/docs/${id}/`,
}));

export function renderDocumentation(markdown) {
  return marked
    .parse(markdown)
    .replace(/^<h1>.*?<\/h1>\s*/, "")
    .replace(
      /<h([1-6])>(.*?)<\/h\1>/g,
      (_all, level, title) =>
        `<h${level} id="${title
          .replace(/<[^>]*>/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .replaceAll(" ", "-")}">${title}</h${level}>`,
    )
    .replace(/href="([^"#:]+\.md)(#[^"]*)?"/g, (_all, path, anchor = "") => {
      const id = path.replace(/^\.\//, "").replace(/\.md$/, "");
      return documentation.some((page) => page.id === id)
        ? `href="/docs/${id}/${anchor}"`
        : `href="https://github.com/yovi-labs/searchivo/blob/develop/docs/${path}${anchor}"`;
    })
    .replace(
      /href="([^"#/:][^"]*)"/g,
      (_all, path) =>
        `href="${path.startsWith("../benchmarks/reports/") ? "/reports/" + path.split("/").at(-1) : "https://github.com/yovi-labs/searchivo/blob/develop/docs/" + path}"`,
    );
}

/** Resolve public symbols from built declarations, including named re-exports. */
export function publicApi() {
  const entries = [];
  for (const name of [
    "core",
    "angular",
    "workers",
    "adapters",
    "devtools",
    "themes",
  ]) {
    const base = `packages/${name}${name === "angular" ? "/dist" : ""}`;
    const manifest = JSON.parse(readFileSync(`${base}/package.json`, "utf8"));
    for (const [subpath, target] of Object.entries(manifest.exports)) {
      if (subpath === "./package.json") continue;
      const declaration = typeof target === "object" ? target.types : undefined;
      entries.push({
        entry: manifest.name + (subpath === "." ? "" : subpath.slice(1)),
        declaration: declaration ? resolve(base, declaration) : null,
        asset: typeof target === "string" ? target : target.default,
      });
    }
  }
  const program = ts.createProgram(
    entries.flatMap((entry) => (entry.declaration ? [entry.declaration] : [])),
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
    },
  );
  const checker = program.getTypeChecker();
  return entries.map((entry) => {
    const source = entry.declaration
      ? program.getSourceFile(entry.declaration)
      : undefined;
    const symbol = source ? checker.getSymbolAtLocation(source) : undefined;
    const symbols = symbol ? checker.getExportsOfModule(symbol) : [];
    const reexports = symbols.flatMap((item) => {
      const target =
        item.flags & ts.SymbolFlags.Alias
          ? checker.getAliasedSymbol(item)
          : item;
      return (target.declarations ?? [])
        .filter(
          (declaration) =>
            declaration.getSourceFile() !== source &&
            declaration
              .getSourceFile()
              .fileName.replaceAll("\\", "/")
              .includes("/packages/"),
        )
        .map((declaration) => declaration.getText());
    });
    return {
      ...entry,
      exports: symbol
        ? checker
            .getExportsOfModule(symbol)
            .map((item) => item.name)
            .sort()
        : [],
      text: source
        ? [source.text, ...new Set(reexports)].join("\n\n")
        : readFileSync(resolve(`packages/themes`, entry.asset), "utf8"),
    };
  });
}
