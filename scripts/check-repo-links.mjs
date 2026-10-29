import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { marked } from "marked";
const files = execFileSync("git", [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
])
  .toString()
  .split("\0")
  .filter((file) => file.endsWith(".md"));
let count = 0;
for (const file of new Set(files)) {
  marked.walkTokens(marked.lexer(readFileSync(file, "utf8")), (token) => {
    if (token.type !== "link" && token.type !== "image") return;
    const href = token.href;
    if (/^(?:[a-z]+:|#)/i.test(href)) return;
    const path = decodeURIComponent(href.split("#")[0]);
    if (!existsSync(resolve(dirname(file), path)))
      throw new Error(`Broken repository link in ${file}: ${href}`);
    count++;
  });
}
console.log(
  `Verified ${count} local Markdown links and images in ${files.length} repository documents`,
);
