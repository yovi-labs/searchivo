import {
  cpSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { execFileSync } from "node:child_process";

// Only this generated directory is replaced. Angular owns /; docs keep their URLs.
rmSync("dist/deploy", { recursive: true, force: true });
mkdirSync("dist/deploy", { recursive: true });
cpSync("dist/website", "dist/deploy", { recursive: true });
mkdirSync("dist/deploy/website", { recursive: true });
cpSync("dist/website/index.html", "dist/deploy/website/index.html");
cpSync("dist/angular-example/browser", "dist/deploy", { recursive: true });
const revision =
  process.env.COMMIT_REF ||
  execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
writeFileSync(
  "dist/deploy/revision.json",
  JSON.stringify({
    revision,
    packageVersion: JSON.parse(
      readFileSync("packages/core/package.json", "utf8"),
    ).version,
  }) + "\n",
);
console.log(
  `Built combined Angular application and documentation at ${revision}`,
);
