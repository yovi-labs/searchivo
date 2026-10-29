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
import { compileString, NodePackageImporter } from "sass";
import { createHash } from "node:crypto";
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
const allowed = /^(package.json|README.md|LICENSE|dist\/.+\.(js|d.ts))$/;
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
    !/^(package.json|README.md|LICENSE|fesm2022\/.+\.mjs(\.map)?|types\/.+\.d.ts)$/.test(
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
const workerPack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/workers"),
  ).toString(),
)[0];
for (const file of workerPack.files)
  if (!allowed.test(file.path))
    throw new Error(`Unexpected worker packed file: ${file.path}`);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, workerPack.filename),
  ],
  temp,
);
writeFileSync(
  join(temp, "workers.mjs"),
  `import { createWorkerClient } from '@searchivo/workers/client';
import { attachWorkerRuntime } from '@searchivo/workers/runtime';
import { webTransport } from '@searchivo/workers/web';
if ([createWorkerClient, attachWorkerRuntime, webTransport].some(value => typeof value !== 'function')) throw new Error('Invalid worker exports');`,
);
run(process.execPath, ["workers.mjs"], temp);
writeFileSync(
  join(temp, "workers.ts"),
  `import { createWorkerClient, type Transport } from '@searchivo/workers/client';
export function check(transport: Transport) { const client = createWorkerClient(transport, (value: unknown): value is {id: number} => typeof value === 'object' && value !== null && 'id' in value);
// @ts-expect-error Search operation requires a string query.
client.request('search', 42);
return client.request('search', 'phone'); }`,
);
const workerConfig = {
  compilerOptions: {
    strict: true,
    target: "ES2022",
    module: "NodeNext",
    lib: ["ES2022", "DOM"],
    types: [],
    outDir: "worker-dist",
  },
  files: ["workers.ts"],
};
writeFileSync(
  join(temp, "tsconfig.workers.json"),
  JSON.stringify(workerConfig),
);
run(
  process.execPath,
  [
    resolve("node_modules/typescript/bin/tsc"),
    "-p",
    join(temp, "tsconfig.workers.json"),
  ],
  temp,
);
copyFileSync(
  join(temp, workerPack.filename),
  join(root, "artifacts", workerPack.filename),
);
console.log(
  `Packed worker entry points and typed protocol consumer passed: ${workerPack.filename}`,
);
const adapterPack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/adapters"),
  ).toString(),
)[0];
for (const file of adapterPack.files)
  if (!allowed.test(file.path))
    throw new Error(`Unexpected adapter packed file: ${file.path}`);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, adapterPack.filename),
  ],
  temp,
);
writeFileSync(
  join(temp, "http.mjs"),
  `import { createServer } from 'node:http';
import { createHttpSource } from '@searchivo/adapters';
import { createCancellation } from '@searchivo/core/source';
const server = createServer(async (request, response) => { let body = ''; for await (const part of request) body += part; const data = JSON.parse(body); response.setHeader('content-type', 'application/json'); response.end(JSON.stringify({ results: [{id:1,score:1,document:{id:1,name:data.query}}], total:1,facets:{} })); });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try { const source = createHttpSource({ endpoint: 'http://127.0.0.1:' + server.address().port, isDocument: value => typeof value === 'object' && value !== null && typeof value.id === 'number' && typeof value.name === 'string' });
const result = await source({query:'phone'}, createCancellation().signal); if (result.results[0].document.name !== 'phone') throw new Error('HTTP round trip failed'); }
finally { await new Promise((resolve,reject) => server.close(error => error ? reject(error) : resolve())); }`,
);
run(process.execPath, ["http.mjs"], temp);
copyFileSync(
  join(temp, adapterPack.filename),
  join(root, "artifacts", adapterPack.filename),
);
console.log(
  `Packed HTTP adapter passed real local HTTP round trip: ${adapterPack.filename}`,
);
const devtoolsPack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/devtools"),
  ).toString(),
)[0];
for (const file of devtoolsPack.files)
  if (!allowed.test(file.path))
    throw new Error(`Unexpected DevTools packed file: ${file.path}`);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, devtoolsPack.filename),
  ],
  temp,
);
writeFileSync(
  join(temp, "devtools.mjs"),
  `import { recordSearch } from '@searchivo/devtools'; import { createSearchState } from '@searchivo/core/state';
const controller = createSearchState(() => ({results:[],total:0,facets:{}})); const recorder = recordSearch(controller); await controller.search({query:'test'}); if (recorder.entries().at(-1).query !== 'test') throw new Error('Recorder failed'); recorder.dispose(); controller.dispose();`,
);
run(process.execPath, ["devtools.mjs"], temp);
copyFileSync(
  join(temp, devtoolsPack.filename),
  join(root, "artifacts", devtoolsPack.filename),
);
console.log(`Packed DevTools consumer passed: ${devtoolsPack.filename}`);
const themePack = JSON.parse(
  run(
    npm,
    ["pack", "--json", "--pack-destination", temp],
    resolve("packages/themes"),
  ).toString(),
)[0];
for (const file of themePack.files)
  if (
    !/^(package.json|README.md|LICENSE|searchivo.css|_index.scss)$/.test(
      file.path,
    )
  )
    throw new Error(`Unexpected theme file: ${file.path}`);
run(
  npm,
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temp, themePack.filename),
  ],
  temp,
);
writeFileSync(
  join(temp, "themes.mjs"),
  `import {readFileSync} from 'node:fs'; const css = readFileSync(new URL(import.meta.resolve('@searchivo/themes/css')), 'utf8'); if (!css.includes('.searchivo-theme') || !css.includes(':focus-visible')) throw new Error('Theme CSS missing');`,
);
run(process.execPath, ["themes.mjs"], temp);
const css = compileString(
  '@use "pkg:@searchivo/themes/scss" as theme; .consumer { @include theme.tokens($accent: #abcdef); }',
  { importers: [new NodePackageImporter(temp)] },
).css;
if (!css.includes("--searchivo-accent: #abcdef"))
  throw new Error("Sass package consumer failed");
copyFileSync(
  join(temp, themePack.filename),
  join(root, "artifacts", themePack.filename),
);
let snippet = 0;
for (const file of ["README.md", "docs/guide.md"]) {
  for (const match of readFileSync(file, "utf8").matchAll(
    /```ts\r?\n([\s\S]*?)```/g,
  )) {
    const name = `docs-${snippet++}.ts`;
    writeFileSync(join(temp, name), match[1]);
    run(
      process.execPath,
      [
        resolve("node_modules/typescript/bin/tsc"),
        "--strict",
        "--noUncheckedIndexedAccess",
        "--exactOptionalPropertyTypes",
        "--target",
        "ES2022",
        "--module",
        "NodeNext",
        "--lib",
        "ES2022",
        "--ignoreConfig",
        "--outDir",
        "doc-dist",
        name,
      ],
      temp,
    );
    run(process.execPath, [`doc-dist/${name.replace(".ts", ".js")}`], temp);
  }
}
console.log(
  `Packed CSS/Sass imports and ${snippet} complete Markdown examples passed`,
);
const packs = [
  pack,
  angularPack,
  workerPack,
  adapterPack,
  devtoolsPack,
  themePack,
];
for (const packed of packs) {
  const metadata = JSON.parse(
    readFileSync(
      join(temp, "node_modules", packed.name, "package.json"),
      "utf8",
    ),
  );
  if (
    metadata.private !== true ||
    metadata.version !== "0.1.0-rebuild.0" ||
    metadata.license !== "MIT" ||
    metadata.repository?.url !== "https://github.com/yovi-labs/searchivo.git"
  )
    throw new Error(`Invalid metadata: ${packed.name}`);
  if (!packed.files.some((file) => file.path === "LICENSE"))
    throw new Error(`Missing license: ${packed.name}`);
  const paths = new Set(packed.files.map((file) => "./" + file.path));
  function checkExports(value) {
    if (typeof value === "string") {
      if (!paths.has(value))
        throw new Error(`Missing export ${packed.name}: ${value}`);
    } else for (const target of Object.values(value)) checkExports(target);
  }
  checkExports(metadata.exports);
}
writeFileSync(
  "artifacts/packed-validation.json",
  JSON.stringify(
    {
      revision: run("git", ["rev-parse", "HEAD"], root).toString().trim(),
      dirty: Boolean(
        run("git", ["status", "--porcelain"], root).toString().trim(),
      ),
      files: packs.map((packed) => ({
        name: packed.filename,
        sha256: createHash("sha256")
          .update(readFileSync(join(root, "artifacts", packed.filename)))
          .digest("hex"),
      })),
    },
    null,
    2,
  ),
);
