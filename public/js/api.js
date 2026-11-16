
import { mockEvents } from "./mockData.js";

const bookings = [];
let bookingCounter = 1;

function createError(message, code = "VALIDATION") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getEventDate(event) {
  return event.date ?? "";
}

function getCheapestPrice(event) {
  const prices = event.tiers
    .map((tier) => tier.priceCents)
    .filter((price) => Number.isSafeInteger(price) && price >= 0);

  return prices.length ? Math.min(...prices) : null;
}

function getAvailableSeats(event) {
  return event.tiers.reduce(
    (total, tier) =>
      total + Math.max(0, tier.capacity - tier.sold),
    0
  );
}

function filterEvents(events, criteria = {}) {
  const {
    q = "",
    city,
    from,
    to,
    maxPriceCents,
    onlyAvailable = false,
  } = criteria;

  if (
    maxPriceCents !== undefined &&
    (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)
  ) {
    throw createError("Maximum price must be a non-negative whole number.");
  }

  if (from && Number.isNaN(Date.parse(from))) {
    throw createError("Start date must be valid.");
  }

  if (to && Number.isNaN(Date.parse(to))) {
    throw createError("End date must be valid.");
  }

  if (from && to && new Date(from) > new Date(to)) {
    throw createError("Start date cannot be later than end date.");
  }

  return events.filter((event) => {
    const query = q.toLowerCase();

    if (
      query &&
      !event.title.toLowerCase().includes(query) &&
      !event.venue.toLowerCase().includes(query)
    ) {
      return false;
    }

    if (
      city &&
      event.city.toLowerCase() !== city.toLowerCase()
    ) {
      return false;
    }

    if (from && getEventDate(event) < from) {
      return false;
    }

    if (to && getEventDate(event) > to) {
      return false;
    }

    if (maxPriceCents !== undefined) {
      const cheapest = getCheapestPrice(event);

      if (cheapest === null || cheapest > maxPriceCents) {
        return false;
      }
    }

    if (onlyAvailable && getAvailableSeats(event) <= 0) {
      return false;
    }

    return true;
  });
}

function sortEvents(events, sortBy = "date") {
  if (!["date", "price", "availability"].includes(sortBy)) {
    throw createError(`Unknown sort option: ${sortBy}`);
  }

  return [...events].sort((a, b) => {
    let result = 0;

    if (sortBy === "date") {
      result = a.date.localeCompare(b.date);
    } else if (sortBy === "price") {
      const priceA = getCheapestPrice(a);
      const priceB = getCheapestPrice(b);

      if (priceA === null && priceB !== null) return 1;
      if (priceA !== null && priceB === null) return -1;

      result = (priceA ?? 0) - (priceB ?? 0);
    } else {
      result = getAvailableSeats(b) - getAvailableSeats(a);
    }

    return result || a.title.localeCompare(b.title);
  });
}

export async function listEvents(criteria = {}, sortBy = "date") {
  const filtered = filterEvents(mockEvents, criteria);

  return sortEvents(filtered, sortBy);
}

export async function getEvent(eventId) {
  const event = mockEvents.find((item) => item.id === eventId);

  if (!event) {
    throw createError("Event not found.", "NOT_FOUND");
  }

  return event;
}

export async function createBooking(input, userId) {
  const { eventId, tierId, customerName, quantity } = input;

  if (!userId || typeof userId !== "string") {
    throw createError("User ID is required.", "UNAUTHORIZED");
  }

  if (typeof customerName !== "string" || !customerName.trim()) {
    throw createError("Customer name is required.");
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
    throw createError("Quantity must be between 1 and 10.");
  }

  const event = await getEvent(eventId);

  // All demo events are treated as published.
  if (event.status && event.status !== "published") {
    throw createError(
      "Tickets can only be booked for published events.",
      "INVALID_STATE"
    );
  }

  const tier = event.tiers.find((item) => item.id === tierId);

  if (!tier) {
    throw createError("Ticket tier not found.", "TIER_NOT_FOUND");
  }

  if (tier.capacity - tier.sold < quantity) {
    throw createError(
      "Not enough tickets are available.",
      "SOLD_OUT"
    );
  }

  const totalCents = tier.priceCents * quantity;

  if (!Number.isSafeInteger(totalCents)) {
    throw createError("Booking total exceeds the supported money range.");
  }

  tier.sold += quantity;

  const booking = {
    id: `mock-booking-${bookingCounter}`,
    reference: `MOCK-${Date.now()}-${bookingCounter}`,
    eventId,
    tierId,
    userId,
    customerName: customerName.trim(),
    quantity,
    totalCents,
    status: "pending",
    transactionReference: null,
  };

  bookingCounter += 1;
  bookings.push(booking);

  return { ...booking };
}

export async function pay(reference, userId, options = {}) {
  const booking = bookings.find(
    (item) => item.reference === reference
  );

  if (!booking) {
    throw createError("Booking not found.", "BOOKING_NOT_FOUND");
  }

  if (booking.userId !== userId) {
    throw createError(
      "You cannot pay for another user's booking.",
      "FORBIDDEN"
    );
  }

  if (booking.status !== "pending") {
    throw createError(
      "Booking cannot be paid in its current state.",
      "INVALID_TRANSITION"
    );
  }

  if (options.shouldDecline === true) {
    throw createError(
      "Your card payment was declined. Please try again.",
      "PAYMENT_DECLINED"
    );
  }

  booking.status = "paid";
  booking.transactionReference = `MOCK-TXN-${Date.now()}`;

  return { ...booking };
}
