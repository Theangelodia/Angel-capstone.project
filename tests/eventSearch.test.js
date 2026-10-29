
import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEvents,
  sortEvents,
  searchEvents,
} from "../src/domain/eventSearch.js";

const events = [
  {
    id: "1",
    title: "Jazz Night",
    venue: "City Hall",
    city: "Lagos",
    date: "2026-12-05T17:00:00",
    tiers: [{ priceCents: 5000, capacity: 100, sold: 20 }],
  },
  {
    id: "2",
    title: "Rock Concert",
    venue: "Arena",
    city: "Abuja",
    date: "2026-11-10T18:00:00",
    tiers: [{ priceCents: 8000, capacity: 50, sold: 50 }],
  },
  {
    id: "3",
    title: "Comedy Night",
    venue: "Lagos Theatre",
    city: "Lagos",
    date: "2026-12-01T19:00:00",
    tiers: [],
  },
];

test("search matches event titles and venues regardless of case", () => {
  assert.equal(filterEvents(events, { q: "JAZZ" }).length, 1);
  assert.equal(filterEvents(events, { q: "lagos theatre" }).length, 1);
});

test("city filtering ignores letter case", () => {
  assert.equal(filterEvents(events, { city: "lagos" }).length, 2);
});

test("maximum price excludes events without ticket tiers", () => {
  const result = filterEvents(events, { maxPriceCents: 6000 });
  assert.deepEqual(result.map((event) => event.id), ["1"]);
});

test("date range includes the entire end date", () => {
  const result = filterEvents(events, {
    from: "2026-12-05",
    to: "2026-12-05",
  });

  assert.deepEqual(result.map((event) => event.id), ["1"]);
});

test("date sorting puts earlier events first", () => {
  const result = sortEvents(events, "date");
  assert.deepEqual(result.map((event) => event.id), ["2", "3", "1"]);
});

test("price sorting puts events without prices last", () => {
  const result = sortEvents(events, "price");
  assert.deepEqual(result.map((event) => event.id), ["1", "2", "3"]);
});

test("availability sorting puts events with more seats first", () => {
  const result = sortEvents(events, "availability");
  assert.deepEqual(result.map((event) => event.id), ["1", "3", "2"]);
});

test("searchEvents filters and sorts without changing the original list", () => {
  const original = [...events];

  const result = searchEvents(events, { city: "Lagos" }, "date");

  assert.deepEqual(result.map((event) => event.id), ["3", "1"]);
  assert.deepEqual(events, original);
});

test("unknown sort option raises a validation error", () => {
  assert.throws(() => sortEvents(events, "random"), {
    code: "VALIDATION",
  });
});

test("invalid maximum price raises a validation error", () => {
  assert.throws(() => filterEvents(events, { maxPriceCents: 1.5 }), {
    code: "VALIDATION",
  });
});


test("invalid date filters raise a validation error", () => {
  assert.throws(
    () => filterEvents(events, { from: "not-a-date" }),
    { code: "VALIDATION" }
  );
});

test("search with no matches returns an empty array", () => {
  assert.deepEqual(
    filterEvents(events, { q: "No Such Event" }),
    []
  );
});

test("filtering does not change the original list", () => {
  const originalIds = events.map((event) => event.id);

  filterEvents(events, { city: "Lagos" });

  assert.deepEqual(
    events.map((event) => event.id),
    originalIds
  );
});
