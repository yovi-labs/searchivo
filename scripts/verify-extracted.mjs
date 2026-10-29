import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
const [candidate, extracted] = process.argv.slice(2);
if (!candidate || !extracted)
  throw new Error(
    "Usage: node scripts/verify-extracted.mjs candidate-dir extracted-searchivo-dir",
  );
const manifest = JSON.parse(
  readFileSync(join(candidate, "manifest.json"), "utf8"),
);
const tracked = execFileSync("git", [
  "ls-tree",
  "-rz",
  "--full-tree",
  manifest.sourceRevision,
])
  .toString()
  .split("\0")
  .filter(Boolean);
for (const line of tracked) {
  const [metadata, path] = line.split("\t");
  if (/(^|\/)(node_modules|\.env|\.git|dist|artifacts)(\/|$)/.test(path))
    throw new Error(`Unexpected archive member ${path}`);
  const bytes = readFileSync(join(extracted, path));
  const blob = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  if (blob !== metadata.split(" ")[2])
    throw new Error(`Archive differs from Git: ${path}`);
}
const count = (directory) =>
  readdirSync(directory, { withFileTypes: true }).reduce(
    (total, item) =>
      total + (item.isDirectory() ? count(join(directory, item.name)) : 1),
    0,
  );
if (count(extracted) !== tracked.length)
  throw new Error("Unexpected extracted files");
for (const file of manifest.files)
  if (
    createHash("sha256")
      .update(readFileSync(join(candidate, file.name)))
      .digest("hex") !== file.sha256
  )
    throw new Error(`Artifact hash mismatch ${file.name}`);
writeFileSync(
  join(candidate, "archive-verification.json"),
  JSON.stringify(
    {
      sourceRevision: manifest.sourceRevision,
      files: tracked.length,
      gitBlobHashesMatch: true,
      artifactHashesMatch: true,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Verified ${tracked.length} extracted source files against Git and all artifact SHA-256 hashes`,
);
