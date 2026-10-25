
import test from "node:test";
import assert from "node:assert/strict";

import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
} from "../src/domain/inventory.js";

import { DomainError } from "../src/domain/errors.js";
import { Queue } from "../src/domain/waitlistqueue.js";

function setup(capacity = 3, priceCents = 5000) {
  const store = createStore();
  const event = createEvent(store, { name: "Test Concert" });
  const tier = addTier(store, event.id, {
    name: "Regular",
    priceCents,
    capacity,
  });

  return { store, event, tier };
}

test("creates an event and ticket tier", () => {
  const { event, tier } = setup();

  assert.equal(event.name, "Test Concert");
  assert.equal(tier.capacity, 3);
  assert.equal(tier.sold, 0);
  assert.equal(tier.priceCents, 5000);
});

test("books tickets and calculates the total in cents", () => {
  const { store, event, tier } = setup();

  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 2,
  });

  assert.equal(booking.quantity, 2);
  assert.equal(booking.totalCents, 10000);
  assert.equal(booking.status, "confirmed");
  assert.equal(tier.sold, 2);
});

test("rejects a sold-out booking without changing inventory", () => {
  const { store, event, tier } = setup(2);

  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 2,
  });

  const bookingsBefore = store.bookingsById.size;

  assert.throws(
    () =>
      bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        customerName: "Bayo",
        quantity: 1,
      }),
    (error) =>
      error instanceof DomainError && error.code === "SOLD_OUT"
  );

  assert.equal(tier.sold, 2);
  assert.equal(store.bookingsById.size, bookingsBefore);
});

test("rejects booking quantities outside 1 to 10", () => {
  const { store, event, tier } = setup(20);

  for (const quantity of [0, -1, 11, 1.5]) {
    assert.throws(
      () =>
        bookTickets(store, {
          eventId: event.id,
          tierId: tier.id,
          customerName: "Ada",
          quantity,
        }),
      DomainError
    );
  }

  assert.equal(tier.sold, 0);
  assert.equal(store.bookingsById.size, 0);
});

test("finds a booking by reference", () => {
  const { store, event, tier } = setup();

  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 1,
  });

  assert.equal(
    findBookingByReference(store, booking.reference),
    booking
  );
  assert.equal(findBookingByReference(store, "BK-NOTFOUND"), null);
});

test("cancellation releases seats", () => {
  const { store, event, tier } = setup();

  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 2,
  });

  cancelBooking(store, booking.reference);

  assert.equal(tier.sold, 0);
  assert.equal(booking.status, "cancelled");
});

test("rejects cancelling the same booking twice", () => {
  const { store, event, tier } = setup();

  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 1,
  });

  cancelBooking(store, booking.reference);

  assert.throws(
    () => cancelBooking(store, booking.reference),
    (error) =>
      error instanceof DomainError &&
      error.code === "ALREADY_CANCELLED"
  );

  assert.equal(tier.sold, 0);
});

test("waitlist preserves first-in, first-out order", () => {
  const { store, event, tier } = setup(1);

  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 1,
  });

  joinWaitlist(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Dara",
    quantity: 1,
  });

  joinWaitlist(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Efe",
    quantity: 1,
  });

  const queue = store.waitlists.get(
    JSON.stringify([event.id, tier.id])
  );

  assert.equal(queue.size, 2);
  assert.equal(queue.peek().customerName, "Dara");
  assert.equal(queue.dequeue().customerName, "Dara");
  assert.equal(queue.peek().customerName, "Efe");
});

test("queue handles empty and single-item states", () => {
  const queue = new Queue();

  assert.equal(queue.size, 0);
  assert.equal(queue.peek(), null);
  assert.equal(queue.dequeue(), null);

  queue.enqueue("First");

  assert.equal(queue.size, 1);
  assert.equal(queue.peek(), "First");
  assert.equal(queue.dequeue(), "First");
  assert.equal(queue.size, 0);
  assert.equal(queue.peek(), null);
});
