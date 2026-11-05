import { fixtureSearch } from "../dist/angular-example/feature-server.mjs";

/** Public read-only fictional fixture; never a general-purpose search backend. */
export async function handleFixture(request, invalid = false) {
  const send = (status, value, extra = {}) =>
    Response.json(value, {
      status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        ...extra,
      },
    });
  if (request.method !== "POST") {
    return send(405, { error: "Use POST" }, { allow: "POST" });
  }
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    return send(415, { error: "Use application/json" });
  try {
    const reader = request.body?.getReader();
    const chunks = [];
    let bytes = 0;
    if (reader) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 10000) {
            await reader.cancel();
            return send(413, { error: "Body too large" });
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body.query !== "string" || body.query.length > 200)
      return send(400, {
        error: "query must be a string of at most 200 code units",
      });
    return send(
      200,
      invalid ? { results: "invalid" } : fixtureSearch(body.query),
    );
  } catch {
    return send(400, { error: "Invalid fixture request" });
  }
}
