
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRouter } from "./router.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = path.resolve(currentDirectory, "../../public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      const error = new Error("Request body is too large");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body contains invalid JSON");
    error.code = "BAD_JSON";
    throw error;
  }
}

async function serveStaticFile(response, pathname) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, {
      error: { code: "BAD_PATH", message: "Invalid file path" },
    });
    return;
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const filePath = path.resolve(publicDirectory, relativePath);

  if (
    filePath !== publicDirectory &&
    !filePath.startsWith(publicDirectory + path.sep)
  ) {
    sendJson(response, 403, {
      error: { code: "FORBIDDEN", message: "Path is not allowed" },
    });
    return;
  }

  try {
    const fileInfo = await stat(filePath);

    if (!fileInfo.isFile()) {
      sendJson(response, 404, {
        error: { code: "NOT_FOUND", message: "File not found" },
      });
      return;
    }

    const contents = await readFile(filePath);
    const contentType =
      MIME_TYPES[path.extname(filePath).toLowerCase()] ??
      "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      sendJson(response, 404, {
        error: { code: "NOT_FOUND", message: "File not found" },
      });
      return;
    }

    throw error;
  }
}

export function createApp() {
  const router = createRouter();

  router.get("/health", (_request, response) => {
    sendJson(response, 200, { status: "ok" });
  });

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = url.pathname;

      
if (pathname.startsWith("/api")) {
  const body =
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH"
      ? await readJson(request)
      : {};

  const route = router.match(request.method, pathname);

  if (!route) {
    sendJson(response, 404, {
      error: { code: "NOT_FOUND", message: "API route not found" },
    });
    return;
  }

  await route.handler(
    { ...request, body, params: route.params, url },
    response,
  );
  return;
}

      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, {
          error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
        });
        return;
      }

      if (pathname === "/health") {
        const route = router.match("GET", pathname);
        route.handler(request, response);
        return;
      }

      await serveStaticFile(response, pathname);
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
        return;
      }

      if (error.code === "BAD_JSON") {
        sendJson(response, 400, {
          error: { code: "BAD_JSON", message: error.message },
        });
        return;
      }

      if (error.code === "PAYLOAD_TOO_LARGE") {
        sendJson(response, 413, {
          error: { code: "PAYLOAD_TOO_LARGE", message: error.message },
        });
        return;
      }

      // Keep internal errors and stack traces out of client responses.
      sendJson(response, 500, {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
    }
  });
}
