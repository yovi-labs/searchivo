import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "searchivo-consumer-"));
const npm = process.platform === "win32" ? "npm.exe" : "npm";
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    stdio: "pipe",
    shell: false,
  });
const pack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/core"),
  ).toString(),
)[0];
const allowed = /^(package.json|README.md|dist\/.+\.(js|d.ts))$/;
for (const file of pack.files)
  if (!allowed.test(file.path))
    throw new Error(`Unexpected packed file: ${file.path}`);
writeFileSync(
  join(temp, "package.json"),
  JSON.stringify({ private: true, type: "module" }),
);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, pack.filename),
  ],
  temp,
);
copyFileSync(resolve("examples/core.ts"), join(temp, "example.ts"));
writeFileSync(
  join(temp, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      target: "ES2022",
      module: "NodeNext",
      types: [],
      lib: ["ES2022"],
      outDir: "dist",
    },
    include: ["example.ts"],
  }),
);
run(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "-p",
    join(temp, "tsconfig.json"),
  ],
  temp,
);
run(process.execPath, ["dist/example.js"], temp);
const pkg = JSON.parse(
  readFileSync(join(temp, "node_modules/@searchivo/core/package.json"), "utf8"),
);
if (!pkg.private || Object.keys(pkg.dependencies ?? {}).length)
  throw new Error("Core must remain private and dependency-free");
mkdirSync("artifacts", { recursive: true });
copyFileSync(join(temp, pack.filename), join(root, "artifacts", pack.filename));
console.log(
  `Packed exports, allowlist, declarations and executable docs passed: ${pack.filename}`,
);
const angularPack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/angular/dist"),
  ).toString(),
)[0];
for (const file of angularPack.files)
  if (
    !/^(package.json|README.md|fesm2022\/.+\.mjs(\.map)?|types\/.+\.d.ts)$/.test(
      file.path,
    )
  )
    throw new Error(`Unexpected Angular packed file: ${file.path}`);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, angularPack.filename),
    "@angular/common@22.2.3",
    "@angular/platform-browser@22.2.3",
  ],
  temp,
);
copyFileSync(
  resolve("apps/angular-example/src/main.ts"),
  join(temp, "angular.ts"),
);
writeFileSync(
  join(temp, "tsconfig.angular.json"),
  JSON.stringify({
    compilerOptions: {
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      target: "ES2022",
      module: "ES2022",
      moduleResolution: "bundler",
      experimentalDecorators: true,
      types: [],
      lib: ["ES2022", "DOM"],
      outDir: "angular-dist",
    },
    angularCompilerOptions: {
      strictTemplates: true,
      strictInjectionParameters: true,
    },
    files: ["angular.ts"],
  }),
);
run(
  process.execPath,
  [
    resolve("node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js"),
    "-p",
    join(temp, "tsconfig.angular.json"),
  ],
  temp,
);
const angularManifest = JSON.parse(
  readFileSync(
    join(temp, "node_modules/@searchivo/angular/package.json"),
    "utf8",
  ),
);
if (
  !angularManifest.private ||
  !angularManifest.exports["."].types ||
  !angularManifest.exports["."].default
)
  throw new Error("Invalid private Angular package format");
copyFileSync(
  join(temp, angularPack.filename),
  join(root, "artifacts", angularPack.filename),
);
console.log(
  `Packed Angular APF and strict AOT template consumer passed: ${angularPack.filename}`,
);
