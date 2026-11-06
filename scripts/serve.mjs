import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { Readable } from "node:stream";
const root = resolve(process.argv[2] ?? "dist/angular-example/browser");
createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
  } catch {
    res.writeHead(400);
    res.end("Invalid URL");
    return;
  }
  if (
    ["/api/search", "/api/invalid"].includes(pathname) &&
    [
      resolve("dist/angular-example/browser"),
      resolve("dist/deploy/example"),
    ].includes(root)
  ) {
    try {
      const { handleFixture } = await import("./fixture-handler.mjs");
      const request = new Request(`http://localhost${pathname}`, {
        method: req.method,
        headers: req.headers,
        ...(["GET", "HEAD"].includes(req.method)
          ? {}
          : { body: Readable.toWeb(req), duplex: "half" }),
      });
      const response = await handleFixture(
        request,
        pathname === "/api/invalid",
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
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
