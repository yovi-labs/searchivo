import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";

const target = process.argv[2] ?? "all";
if (!["all", "official", "example"].includes(target))
  throw new Error("Unknown deployment target");
if (target === "all") rmSync("dist/deploy", { recursive: true, force: true });
const revision =
  process.env.COMMIT_REF ||
  execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
for (const [name, source] of [
  ["official", "dist/website"],
  ["example", "dist/angular-example/browser"],
]) {
  if (target !== "all" && target !== name) continue;
  const output = `dist/deploy/${name}`;
  // Fixed generated output paths only; never remove source or another site's output.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  cpSync(source, output, { recursive: true });
  writeFileSync(
    `${output}/revision.json`,
    JSON.stringify({
      revision,
      site: name,
      packageVersion: JSON.parse(
        readFileSync("packages/core/package.json", "utf8"),
      ).version,
    }) + "\n",
  );
  writeFileSync(
    `${output}/_redirects`,
    name === "official"
      ? "/website/ / 301\n"
      : "/docs/* https://searchivo.netlify.app/docs/:splat 301\n",
  );
}
console.log(`Built ${target} deployment output at ${revision}`);
