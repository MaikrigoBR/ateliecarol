const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4174;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safeResolve(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.normalize(path.join(ROOT, cleanPath));
  if (!resolved.startsWith(ROOT)) {
    return null;
  }
  return resolved;
}

const server = http.createServer((request, response) => {
  const filePath = safeResolve(request.url.split("?")[0]);

  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Acesso negado.");
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Arquivo nao encontrado.");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  });
});

server.listen(PORT, () => {
  console.log(`Training Hub Independente em http://localhost:${PORT}`);
});
