import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
function check(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      check(path);
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
        !node.moduleSpecifier.text.startsWith(".")
      )
        throw new Error(`Core external dependency: ${path}`);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
check("packages/core/src");
console.log("Core dependency direction and no-any boundary passed");
