import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
const git = (...args) => execFileSync("git", args).toString().trim();
if (git("status", "--porcelain"))
  throw new Error("Commit the reviewed source before preparing candidates");
const revision = git("rev-parse", "HEAD");
const receipt = JSON.parse(
  readFileSync("artifacts/packed-validation.json", "utf8"),
);
if (
  receipt.revision !== revision ||
  receipt.dirty ||
  receipt.files.length !== 6
)
  throw new Error("Run packed validation from this clean revision first");
const out = `artifacts/candidate-${revision.slice(0, 12)}`;
mkdirSync(out, { recursive: true });
const files = [];
for (const file of receipt.files) {
  const bytes = readFileSync(join("artifacts", file.name));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== file.sha256)
    throw new Error(`Tarball changed since validation: ${file.name}`);
  copyFileSync(join("artifacts", file.name), join(out, file.name));
  files.push({ ...file, bytes: bytes.length });
}
const archive = `searchivo-source-${revision.slice(0, 12)}.zip`;
execFileSync("git", [
  "archive",
  "--format=zip",
  "--prefix=searchivo/",
  `--output=${join(out, archive)}`,
  revision,
]);
const bytes = readFileSync(join(out, archive));
files.push({
  name: archive,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: bytes.length,
});
writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify(
    {
      version: "0.1.0-rebuild.0",
      private: true,
      sourceRevision: revision,
      node: process.version,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(out);
