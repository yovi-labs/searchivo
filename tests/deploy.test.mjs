import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

test("official and application deployments have independent roots and revisions", () => {
  const official = readFileSync("dist/deploy/official/index.html", "utf8");
  const example = readFileSync("dist/deploy/example/index.html", "utf8");
  assert.ok(official.includes("SEARCH<br>"));
  assert.ok(official.includes("https://searchivo-market.netlify.app/"));
  assert.ok(!official.includes("<app-root>"));
  assert.ok(example.includes("<app-root>"));
  assert.ok(!readdirSync("dist/deploy/official").includes("feature-worker.js"));
  assert.ok(readdirSync("dist/deploy/example").includes("feature-worker.js"));
  const a = JSON.parse(
    readFileSync("dist/deploy/official/revision.json", "utf8"),
  );
  const b = JSON.parse(
    readFileSync("dist/deploy/example/revision.json", "utf8"),
  );
  assert.equal(a.site, "official");
  assert.equal(b.site, "example");
  assert.equal(a.revision, b.revision);
  assert.equal(a.packageVersion, "0.1.0");
});
