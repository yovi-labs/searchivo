import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
const root = resolve("dist/website");
let checked = 0;
function visit(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      visit(path);
      continue;
    }
    if (!path.endsWith(".html")) continue;
    const html = readFileSync(path, "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const link = match[1];
      if (/^(https?:|mailto:)/.test(link)) continue;
      const [file, anchor] = link.split("#");
      let target = file
        ? resolve(
            file.startsWith("/") ? root : dirname(path),
            "." + (file.startsWith("/") ? file : "/" + file),
          )
        : path;
      if (target.endsWith("/") || (file && file.endsWith("/")))
        target = resolve(target, "index.html");
      if (!existsSync(target))
        throw new Error(`Broken link ${link} in ${path}`);
      if (anchor && !readFileSync(target, "utf8").includes(`id="${anchor}"`))
        throw new Error(`Missing anchor ${link}`);
      checked++;
    }
  }
}
visit(root);
console.log(`Verified ${checked} internal page, anchor and asset links`);
