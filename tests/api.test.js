
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/http/app.js";

async function startServer(t) {
  const server = createApp();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  return baseUrl;
}

async function request(baseUrl, path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

test("Build 4 API supports event creation, publishing, searching and booking", async (t) => {
  const baseUrl = await startServer(t);

  const eventResponse = await request(baseUrl, "/api/events", {
    method: "POST",
    body: JSON.stringify({
      title: "NextGenSound Live",
      city: "Lagos",
      venue: "Ikeja",
      date: "2027-01-15",
    }),
  });

  assert.equal(eventResponse.status, 201);
  const event = await eventResponse.json();

  const tierResponse = await request(baseUrl, `/api/events/${event.id}/tiers`, {
    method: "POST",
    body: JSON.stringify({
      name: "Regular",
      priceCents: 500000,
      capacity: 10,
    }),
  });

  assert.equal(tierResponse.status, 201);
  const tier = await tierResponse.json();

  const publishResponse = await request(baseUrl, `/api/events/${event.id}/publish`, {
    method: "POST",
  });

  assert.equal(publishResponse.status, 200);

  const searchResponse = await request(baseUrl, "/api/events?city=Lagos");
  assert.equal(searchResponse.status, 200);

  const events = await searchResponse.json();
  assert.equal(events.length, 1);

  const bookingResponse = await request(baseUrl, "/api/bookings", {
    method: "POST",
    headers: { "x-user-id": "user-1" },
    body: JSON.stringify({
      eventId: event.id,
      tierId: tier.id,
      customerName: "Angel",
      quantity: 2,
    }),
  });

  assert.equal(bookingResponse.status, 201);
  const booking = await bookingResponse.json();
  assert.equal(booking.status, "pending");

  const paymentResponse = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/pay`,
    {
      method: "POST",
      headers: { "x-user-id": "user-1" },
      body: JSON.stringify({ shouldDecline: false }),
    },
  );

  assert.equal(paymentResponse.status, 200);
  const paidBooking = await paymentResponse.json();
  assert.equal(paidBooking.status, "paid");
  assert.ok(paidBooking.transactionReference);
});

test("declined payment leaves a booking pending and allows retry", async (t) => {
  const baseUrl = await startServer(t);

  const event = await createPublishedEvent(baseUrl);
  const booking = await createBooking(baseUrl, event);

  const declined = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/pay`,
    {
      method: "POST",
      headers: { "x-user-id": "user-1" },
      body: JSON.stringify({ shouldDecline: true }),
    },
  );

  assert.equal(declined.status, 402);
  const error = await declined.json();
  assert.equal(error.error.code, "PAYMENT_DECLINED");

  const retry = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/pay`,
    {
      method: "POST",
      headers: { "x-user-id": "user-1" },
      body: JSON.stringify({ shouldDecline: false }),
    },
  );

  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).status, "paid");
});

test("users cannot pay for another user's booking", async (t) => {
  const baseUrl = await startServer(t);
  const event = await createPublishedEvent(baseUrl);
  const booking = await createBooking(baseUrl, event);

  const response = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/pay`,
    {
      method: "POST",
      headers: { "x-user-id": "user-2" },
      body: JSON.stringify({ shouldDecline: false }),
    },
  );

  assert.equal(response.status, 403);
});

test("unpaid bookings can be cancelled but cannot be paid afterwards", async (t) => {
  const baseUrl = await startServer(t);
  const event = await createPublishedEvent(baseUrl);
  const booking = await createBooking(baseUrl, event);

  const cancelResponse = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/cancel`,
    {
      method: "POST",
      headers: { "x-user-id": "user-1" },
    },
  );

  assert.equal(cancelResponse.status, 200);
  assert.equal((await cancelResponse.json()).status, "cancelled");

  const payResponse = await request(
    baseUrl,
    `/api/bookings/${booking.reference}/pay`,
    {
      method: "POST",
      headers: { "x-user-id": "user-1" },
      body: JSON.stringify({ shouldDecline: false }),
    },
  );

  assert.equal(payResponse.status, 409);
});

async function createPublishedEvent(baseUrl) {
  const response = await request(baseUrl, "/api/events", {
    method: "POST",
    body: JSON.stringify({
      title: "Test Event",
      city: "Lagos",
      venue: "Ikeja",
      date: "2027-02-20",
    }),
  });

  const event = await response.json();

  const tierResponse = await request(baseUrl, `/api/events/${event.id}/tiers`, {
    method: "POST",
    body: JSON.stringify({
      name: "Regular",
      priceCents: 500000,
      capacity: 10,
    }),
  });

  const tier = await tierResponse.json();

  await request(baseUrl, `/api/events/${event.id}/publish`, {
    method: "POST",
  });

  return { ...event, tierId: tier.id };
}

async function createBooking(baseUrl, event) {
  const response = await request(baseUrl, "/api/bookings", {
    method: "POST",
    headers: { "x-user-id": "user-1" },
    body: JSON.stringify({
      eventId: event.id,
      tierId: event.tierId,
      customerName: "Angel",
      quantity: 1,
    }),
  });

  return response.json();
}

