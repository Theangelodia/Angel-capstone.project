
import { DomainError } from "./errors.js";
import { newId, newReference } from "./ids.js";
import { Queue } from "./waitlistqueue.js";

function fail(message, code = "VALIDATION") {
  throw new DomainError(message, code);
}

function requireObject(value, name) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${name} must be an object.`);
  }
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${name} must be a non-empty string.`);
  }
}

function requirePositiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${name} must be a positive safe integer.`);
  }
}

function requireStore(store) {
  if (
    store === null ||
    typeof store !== "object" ||
    !(store.events instanceof Map) ||
    !(store.bookingsById instanceof Map) ||
    !(store.bookingsByReference instanceof Map) ||
    !(store.waitlists instanceof Map)
  ) {
    fail("A valid inventory store is required.");
  }
}

function getEvent(store, eventId) {
  requireString(eventId, "eventId");
  const event = store.events.get(eventId);

  if (!event) {
    fail("Event not found.", "NOT_FOUND");
  }

  return event;
}

function getTier(store, eventId, tierId) {
  const event = getEvent(store, eventId);
  requireString(tierId, "tierId");

  const tier = event.tiers.get(tierId);

  if (!tier) {
    fail("Ticket tier not found.", "TIER_NOT_FOUND");
  }

  return { event, tier };
}

function validateQuantity(quantity) {
  requirePositiveInteger(quantity, "quantity");

  if (quantity > 10) {
    fail("A booking can contain at most 10 tickets.");
  }
}

function waitlistKey(eventId, tierId) {
  return JSON.stringify([eventId, tierId]);
}

export function createStore() {
  return {
    events: new Map(),
    bookingsById: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}


export function createEvent(store, input) {
  requireStore(store);
  requireObject(input, "Event input");

  const isBuild2Event =
    "title" in input ||
    "city" in input ||
    "venue" in input ||
    "date" in input;

  const title = isBuild2Event ? input.title : input.name;

  requireString(title, "Event title");

  if (isBuild2Event) {
    requireString(input.city, "Event city");
    requireString(input.venue, "Event venue");

    if (
      typeof input.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input.date) ||
      Number.isNaN(new Date(input.date).getTime()) ||
      (input.date.length === 10 &&
        new Date(input.date).toISOString().slice(0, 10) !== input.date)
    ) {
      fail("Event date must be a valid ISO date.");
    }
  }

  const event = {
    id: newId(),
    name: title.trim(),
    title: title.trim(),
    city: isBuild2Event ? input.city.trim() : "",
    venue: isBuild2Event ? input.venue.trim() : "",
    date: isBuild2Event ? input.date : "",
    status: "draft",
    tiers: new Map(),
  };

  store.events.set(event.id, event);
  return event;
}


export function addTier(store, eventId, input) {
  requireStore(store);
  requireObject(input, "Tier input");

  const event = getEvent(store, eventId);
  requireString(input.name, "Tier name");
  requirePositiveInteger(input.capacity, "capacity");

  if (
    !Number.isSafeInteger(input.priceCents) ||
    input.priceCents < 0
  ) {
    fail("priceCents must be a non-negative safe integer.");
  }

  const tier = {
    id: newId(),
    name: input.name.trim(),
    priceCents: input.priceCents,
    capacity: input.capacity,
    sold: 0,
  };

  event.tiers.set(tier.id, tier);
  return tier;
}


export function bookTickets(store, input) {
  requireStore(store);
  requireObject(input, "Booking input");

  const { eventId, tierId, customerName, quantity } = input;

  requireString(customerName, "customerName");
  validateQuantity(quantity);

  const { event, tier } = getTier(store, eventId, tierId);

  if (event.status !== "published") {
    fail("Tickets can only be booked for published events.", "INVALID_STATE");
  }

  const available = tier.capacity - tier.sold;

  if (quantity > available) {
    fail("Not enough tickets are available.", "SOLD_OUT");
  }

  const totalCents = tier.priceCents * quantity;

  if (!Number.isSafeInteger(totalCents)) {
    fail("Booking total exceeds the supported money range.");
  }

  const booking = {
    id: newId(),
    reference: newReference(),
    eventId: event.id,
    tierId: tier.id,
    customerName: customerName.trim(),
    quantity,
    totalCents,
    status: "pending",
  };

  if (store.bookingsByReference.has(booking.reference)) {
    fail("Booking reference collision. Please try again.", "ID_COLLISION");
  }

  // Change inventory only after all validation succeeds.
  tier.sold += quantity;
  store.bookingsById.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking);

  return booking;
}

export function cancelBooking(store, reference) {
  requireStore(store);
  requireString(reference, "reference");

  const booking = store.bookingsByReference.get(reference);

  if (!booking) {
    fail("Booking not found.", "BOOKING_NOT_FOUND");
  }

  if (booking.status === "cancelled") {
    fail("This booking has already been cancelled.", "ALREADY_CANCELLED");
  }

  const { tier } = getTier(store, booking.eventId, booking.tierId);

  if (tier.sold < booking.quantity) {
    fail("Inventory is inconsistent; cancellation cannot proceed.", "INVENTORY_ERROR");
  }

  tier.sold -= booking.quantity;
  booking.status = "cancelled";

  return booking;
}

export function findBookingByReference(store, reference) {
  requireStore(store);
  requireString(reference, "reference");

  return store.bookingsByReference.get(reference) ?? null;
}

export function joinWaitlist(store, input) {
  requireStore(store);
  requireObject(input, "Waitlist input");

  const { eventId, tierId, customerName, quantity } = input;

  requireString(customerName, "customerName");
  validateQuantity(quantity);

  const { event, tier } = getTier(store, eventId, tierId);

  if (tier.capacity - tier.sold >= quantity) {
    fail("Tickets are available; book them instead of joining the waitlist.", "TICKETS_AVAILABLE");
  }

  const key = waitlistKey(event.id, tier.id);

  let queue = store.waitlists.get(key);

  if (!queue) {
    queue = new Queue();
    store.waitlists.set(key, queue);
  }

  const entry = {
    id: newId(),
    eventId: event.id,
    tierId: tier.id,
    customerName: customerName.trim(),
    quantity,
  };

  queue.enqueue(entry);
  return entry;
}


export function publishEvent(store, eventId) {
  requireStore(store);

  const event = getEvent(store, eventId);

  if (event.tiers.size === 0) {
    fail("An event must have at least one ticket tier before publishing.", "INVALID_STATE");
  }
  event.status = "published";

  return event;
}

export function unpublishEvent(store, eventId) {
  requireStore(store);

  const event = getEvent(store, eventId);
  event.status = "draft";

  return event;
}

export function listEventSummaries(store, { publishedOnly = true } = {}) {
  requireStore(store);

  const summaries = [];

  for (const event of store.events.values()) {
    if (publishedOnly && event.status !== "published") {
      continue;
    }

    const tiers = Array.from(event.tiers.values());

    summaries.push({
      id: event.id,
      name: event.name,
      status: event.status ?? "draft",
      tiers: tiers.map((tier) => ({
        id: tier.id,
        name: tier.name,
        priceCents: tier.priceCents,
        capacity: tier.capacity,
        sold: tier.sold,
        seatsLeft: tier.capacity - tier.sold,
      })),
    });
  }

  return summaries;
}
