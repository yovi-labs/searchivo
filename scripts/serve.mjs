import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve(process.argv[2] ?? "dist/angular-example/browser");
createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://localhost").pathname,
  );
  if (pathname.startsWith("/api/") && root.endsWith("browser")) {
    try {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 10000) throw new Error("Body too large");
      }
      const request = JSON.parse(body);
      if (typeof request.query !== "string") throw new Error("Expected query");
      const { fixtureSearch } =
        await import("../dist/angular-example/feature-server.mjs");
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify(
          pathname === "/api/invalid"
            ? { results: "invalid" }
            : fixtureSearch(request.query),
        ),
      );
    } catch {
      res.writeHead(400);
      res.end("Invalid fixture request");
    }
    return;
  }
  const path = resolve(
    root,
    `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`,
  );
  if (!path.startsWith(root + "/") && !path.startsWith(root + "\\")) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const bytes = await readFile(path);
    res.setHeader(
      "content-type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
      }[extname(path)] ?? "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(Number(process.argv[3] ?? 4173), "127.0.0.1");
