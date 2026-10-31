
import test from "node:test";
import assert from "node:assert/strict";
import { createRouter } from "../src/http/router.js";

test("matches a route by HTTP method and path", () => {
  const router = createRouter();
  const handler = () => {};

  router.get("/health", handler);

  assert.equal(router.match("GET", "/health").handler, handler);
  assert.equal(router.match("POST", "/health"), null);
  assert.equal(router.match("GET", "/missing"), null);
});

test("extracts route parameters", () => {
  const router = createRouter();
  const handler = () => {};

  router.get("/api/events/:id", handler);

  const result = router.match("GET", "/api/events/event-123");

  assert.equal(result.handler, handler);
  assert.deepEqual(result.params, { id: "event-123" });
});

test("matches multiple route parameters", () => {
  const router = createRouter();

  router.get("/api/events/:eventId/tiers/:tierId", () => {});

  const result = router.match(
    "GET",
    "/api/events/event-1/tiers/tier-2",
  );

  assert.deepEqual(result.params, {
    eventId: "event-1",
    tierId: "tier-2",
  });
});

test("does not match paths with different segment counts", () => {
  const router = createRouter();

  router.get("/api/events/:id", () => {});

  assert.equal(router.match("GET", "/api/events"), null);
  assert.equal(router.match("GET", "/api/events/1/extra"), null);
});
