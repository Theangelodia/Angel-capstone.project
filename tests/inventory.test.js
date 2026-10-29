
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
  publishEvent,
  unpublishEvent,
  listEventSummaries,
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

  publishEvent(store, event.id);

  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Ada",
    quantity: 2,
  });

  assert.equal(booking.quantity, 2);
  assert.equal(booking.totalCents, 10000);
  assert.equal(booking.status, "pending");
  assert.equal(tier.sold, 2);
});

test("rejects a sold-out booking without changing inventory", () => {
  const { store, event, tier } = setup(2);

  publishEvent(store, event.id);


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

  publishEvent(store, event.id);

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

  publishEvent(store, event.id);

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

  publishEvent(store, event.id);

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

  publishEvent(store, event.id);

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


test("events are drafts and hidden from the public list by default", () => {
  const store = createStore();
  const event = createEvent(store, { name: "Jazz Night" });

  assert.equal(event.status ?? "draft", "draft");
  assert.deepEqual(listEventSummaries(store), []);
  assert.equal(listEventSummaries(store, { publishedOnly: false }).length, 1);
});


test("publishing an event requires at least one ticket tier", () => {
  const store = createStore();
  const event = createEvent(store, { name: "Jazz Night" });

  assert.throws(
    () => publishEvent(store, event.id),
    (error) => error.code === "INVALID_STATE"
  );
});

test("published events appear in the public list", () => {
  const store = createStore();
  const event = createEvent(store, { name: "Jazz Night" });

  addTier(store, event.id, {
    name: "General",
    priceCents: 500000,
    capacity: 100,
  });

  publishEvent(store, event.id);

  const summaries = listEventSummaries(store);

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].status, "published");
  assert.equal(summaries[0].tiers[0].seatsLeft, 100);
});

test("Build 2 events save title, city, venue, date and draft status", () => {
  const store = createStore();

  const event = createEvent(store, {
    title: "Jazz Night",
    city: "Lagos",
    venue: "City Hall",
    date: "2026-12-05",
  });

  assert.equal(event.title, "Jazz Night");
  assert.equal(event.city, "Lagos");
  assert.equal(event.venue, "City Hall");
  assert.equal(event.date, "2026-12-05");
  assert.equal(event.status, "draft");
});


test("Build 2 event creation rejects missing title or city", () => {
  const store = createStore();

  assert.throws(
    () =>
      createEvent(store, {
        title: "",
        city: "Lagos",
        venue: "City Hall",
        date: "2026-12-05",
      }),
    { code: "VALIDATION" }
  );

  assert.throws(
    () =>
      createEvent(store, {
        title: "Jazz Night",
        city: "",
        venue: "City Hall",
        date: "2026-12-05",
      }),
    { code: "VALIDATION" }
  );

  assert.equal(store.events.size, 0);
});

test("Build 2 event creation rejects an invalid date without saving", () => {
  const store = createStore();

  assert.throws(
    () =>
      createEvent(store, {
        title: "Jazz Night",
        city: "Lagos",
        venue: "City Hall",
        date: "not-a-date",
      }),
    { code: "VALIDATION" }
  );

  assert.equal(store.events.size, 0);
});


test("unpublishing an event returns it to draft and hides it publicly", () => {
  const store = createStore();
  const event = createEvent(store, { name: "Jazz Night" });

  addTier(store, event.id, {
    name: "General",
    priceCents: 500000,
    capacity: 100,
  });

  publishEvent(store, event.id);
  unpublishEvent(store, event.id);

  assert.equal(event.status, "draft");
  assert.deepEqual(listEventSummaries(store), []);
});

test("rejects booking tickets for an unpublished event", () => {
  const { store, event, tier } = setup();

  assert.throws(
    () =>
      bookTickets(store, {
        eventId: event.id,
        tierId: tier.id,
        customerName: "Ada",
        quantity: 1,
      }),
    {
      code: "INVALID_STATE",
    }
  );
});