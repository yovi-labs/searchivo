import { test } from "node:test";
import assert from "node:assert/strict";
import search from "../netlify/functions/search.mjs";
import invalid from "../netlify/functions/invalid.mjs";

const request = (body, headers = { "content-type": "application/json" }) =>
  new Request("https://example.test/api/search", {
    method: "POST",
    headers,
    body,
  });

test("deployed function entry points search fixtures and deliberately reject invalid envelopes", async () => {
  const response = await search(request(JSON.stringify({ query: "phone" })));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const value = await response.json();
  assert.ok(value.results.some((hit) => hit.document.name.includes("iPhone")));
  assert.equal(value.total, value.results.length);
  assert.deepEqual(await (await invalid(request('{"query":"phone"}'))).json(), {
    results: "invalid",
  });
});

test("fixture enforces method, media type, query and byte limits", async () => {
  const get = await search(new Request("https://example.test/api/search"));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");
  assert.equal(
    (await search(request("{}", { "content-type": "text/plain" }))).status,
    415,
  );
  for (const body of [
    "{",
    "null",
    "[]",
    '{"query":12}',
    JSON.stringify({ query: "x".repeat(201) }),
  ])
    assert.equal((await search(request(body))).status, 400);
  assert.equal(
    (await search(request(JSON.stringify({ query: "😀".repeat(3000) }))))
      .status,
    413,
  );
  assert.equal((await search(request('{"query":""}'))).status, 200);
  const streamed = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(6000));
      controller.enqueue(new Uint8Array(6000));
      controller.close();
    },
  });
  assert.equal(
    (
      await search(
        new Request("https://example.test/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: streamed,
          duplex: "half",
        }),
      )
    ).status,
    413,
  );
});
