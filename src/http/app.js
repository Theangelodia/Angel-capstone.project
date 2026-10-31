import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createRouter } from "./router.js";
import { DomainError } from "../domain/errors.js";
import { createMemoryRepository } from "../repositories/memory.js";
import { createEventService } from "../services/eventService.js";
import { createBookingService } from "../services/bookingService.js";
import { createMockPaymentGateway } from "../lib/mockPaymentGateway.js";

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

function serializeEvent(event) {
  return {
    ...event,
    tiers: [...event.tiers.values()],
  };
}

function errorStatus(error) {
  const statuses = {
    VALIDATION: 400,
    BAD_JSON: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIER_NOT_FOUND: 404,
    BOOKING_NOT_FOUND: 404,
    PAYMENT_DECLINED: 402,
    SOLD_OUT: 409,
    INVALID_STATE: 409,
    INVALID_TRANSITION: 409,
    ALREADY_CANCELLED: 409,
    ID_COLLISION: 409,
    INVENTORY_ERROR: 409,
    TICKETS_AVAILABLE: 409,
  };

  return statuses[error.code] ?? 500;
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

  const relativePath =
    decodedPath === "/" ? "index.html" : decodedPath.slice(1);

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

  const repository = createMemoryRepository();
  const paymentGateway = createMockPaymentGateway();

  const events = createEventService(repository);
  const bookings = createBookingService(repository, paymentGateway);

  router.get("/health", (_request, response) => {
    sendJson(response, 200, { status: "ok" });
  });

  // Create event
  router.post("/api/events", async (request, response) => {
    const event = await events.create(request.body);
    sendJson(response, 201, serializeEvent(event));
  });

  // Add ticket tier
  router.post("/api/events/:id/tiers", async (request, response) => {
    const tier = await events.addTicketTier(
      request.params.id,
      request.body,
    );

    sendJson(response, 201, tier);
  });

  // Publish event
  router.post("/api/events/:id/publish", async (request, response) => {
    const event = await events.publish(request.params.id);
    sendJson(response, 200, serializeEvent(event));
  });

  // Unpublish event
  router.post("/api/events/:id/unpublish", async (request, response) => {
    const event = await events.unpublish(request.params.id);
    sendJson(response, 200, serializeEvent(event));
  });

  // Search published events
  router.get("/api/events", async (request, response) => {
    const params = request.url.searchParams;

    let maxPriceCents;

    if (params.has("maxPriceCents")) {
      const rawPrice = params.get("maxPriceCents");

      if (!/^\d+$/.test(rawPrice)) {
        throw new DomainError(
          "maxPriceCents must be a non-negative whole number.",
          "VALIDATION",
        );
      }

      maxPriceCents = Number(rawPrice);
    }

    let onlyAvailable = false;

    if (params.has("onlyAvailable")) {
      const value = params.get("onlyAvailable");

      if (value !== "true" && value !== "false") {
        throw new DomainError(
          "onlyAvailable must be true or false.",
          "VALIDATION",
        );
      }

      onlyAvailable = value === "true";
    }

    const results = await events.search(
      {
        q: params.get("q") ?? "",
        city: params.get("city") ?? undefined,
        from: params.get("from") ?? undefined,
        to: params.get("to") ?? undefined,
        maxPriceCents,
        onlyAvailable,
      },
      params.get("sort") ?? "date",
    );

    sendJson(response, 200, results);
  });

  // Book tickets
  router.post("/api/bookings", async (request, response) => {
    const userId = request.headers["x-user-id"];

    const booking = await bookings.book(request.body, userId);

    sendJson(response, 201, booking);
  });

  // Pay for a booking
  router.post(
    "/api/bookings/:reference/pay",
    async (request, response) => {
      const userId = request.headers["x-user-id"];

      const booking = await bookings.pay(
        request.params.reference,
        userId,
        { shouldDecline: request.body.shouldDecline === true },
      );

      sendJson(response, 200, booking);
    },
  );

  // Cancel an unpaid booking
  router.post(
    "/api/bookings/:reference/cancel",
    async (request, response) => {
      const userId = request.headers["x-user-id"];

      const booking = await bookings.cancel(
        request.params.reference,
        userId,
      );

      sendJson(response, 200, booking);
    },
  );

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const pathname = url.pathname;

      if (pathname.startsWith("/api")) {
        const body =
          ["POST", "PUT", "PATCH"].includes(request.method)
            ? await readJson(request)
            : {};

        const route = router.match(request.method, pathname);

        if (!route) {
          sendJson(response, 404, {
            error: {
              code: "NOT_FOUND",
              message: "API route not found",
            },
          });
          return;
        }

        await route.handler(
          {
            method: request.method,
            headers: request.headers,
            body,
            params: route.params,
            url,
          },
          response,
        );

        return;
      }

      if (request.method !== "GET" && request.method !== "HEAD") {
        sendJson(response, 405, {
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Method not allowed",
          },
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

      if (error.code === "PAYLOAD_TOO_LARGE") {
        sendJson(response, 413, {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: error.message,
          },
        });
        return;
      }

      const status = errorStatus(error);

      sendJson(response, status, {
        error: {
          code: error.code ?? "INTERNAL_ERROR",
          message:
            status === 500
              ? "An unexpected error occurred"
              : error.message,
        },
      });
    }
  });
}