import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
function check(dir, allowed) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      check(path, allowed);
      continue;
    }
    if (!path.endsWith(".ts")) continue;
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node) {
      if (node.kind === ts.SyntaxKind.AnyKeyword)
        throw new Error(`any is prohibited: ${path}`);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        !node.moduleSpecifier.text.startsWith(".") &&
        !allowed.some(
          (prefix) =>
            node.moduleSpecifier.text === prefix ||
            node.moduleSpecifier.text.startsWith(prefix + "/"),
        )
      )
        throw new Error(
          `Disallowed package dependency: ${path}: ${node.moduleSpecifier.text}`,
        );
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
for (const [name, allowed] of Object.entries({
  core: [],
  angular: ["@searchivo/core", "@angular/core"],
  workers: ["@searchivo/core"],
  adapters: ["@searchivo/core"],
  devtools: ["@searchivo/core"],
}))
  check(`packages/${name}/src`, allowed);
console.log("All library dependency directions and no-any boundaries passed");
