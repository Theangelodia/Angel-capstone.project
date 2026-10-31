
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/http/app.js";

test("GET /health returns HTTP 200 and JSON status ok", async (t) => {
  const server = createApp();

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  t.after(() => new Promise((resolve) => server.close(resolve)));

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("unknown API routes return a JSON 404", async (t) => {
  const server = createApp();

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/missing`,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: "NOT_FOUND", message: "API route not found" },
  });
});

test("malformed JSON sent to an unknown API route returns JSON 400", async (t) => {
  const server = createApp();

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(
    `http://127.0.0.1:${server.address().port}/api/missing`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid",
    },
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: {
      code: "BAD_JSON",
      message: "Request body contains invalid JSON",
    },
  });
});
