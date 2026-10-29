
import { DomainError } from "./errors.js";
import { mergeSort } from "./sorting.js";

function fail(message) {
  throw new DomainError(message, "VALIDATION");
}

function matchesText(value, query) {
  return String(value ?? "")
    .toLowerCase()
    .includes(query.toLowerCase());
}

function getDate(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) {
    fail(`${fieldName} must be a valid ISO date.`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    fail(`${fieldName} must be a valid ISO date.`);
  }

  if (value.length === 10 && date.toISOString().slice(0, 10) !== value) {
    fail(`${fieldName} must be a valid ISO date.`);
  }

  return date;
}

function eventDate(event) {
  return event.date ?? event.startsAt ?? "";
}

function eventTitle(event) {
  return event.title ?? event.name ?? "";
}

function cheapestPrice(event) {
  const tiers = event.tiers ?? [];
  const prices = tiers
    .map((tier) => tier.priceCents)
    .filter((price) => Number.isSafeInteger(price) && price >= 0);

  return prices.length ? Math.min(...prices) : null;
}

function seatsAvailable(event) {
  const tiers = event.tiers ?? [];

  return tiers.reduce(
    (total, tier) =>
      total + Math.max(0, (tier.capacity ?? 0) - (tier.sold ?? 0)),
    0
  );
}

export function filterEvents(
  summaries,
  {
    q = "",
    city,
    from,
    to,
    maxPriceCents,
    onlyAvailable = false,
  } = {}
) {
  const startDate = getDate(from, "from");
  const endDate = getDate(to, "to");

  if (
    startDate &&
    endDate &&
    startDate.getTime() > endDate.getTime()
  ) {
    fail("from cannot be later than to.");
  }

  if (
    maxPriceCents !== undefined &&
    (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)
  ) {
    fail("maxPriceCents must be a non-negative whole number.");
  }

  return summaries.filter((event) => {
    if (
      q &&
      !matchesText(eventTitle(event), q) &&
      !matchesText(event.venue, q)
    ) {
      return false;
    }

    if (city && String(event.city ?? "").toLowerCase() !== city.toLowerCase()) {
      return false;
    }

    const date = eventDate(event);

    if (startDate && (!date || new Date(date) < startDate)) {
      return false;
    }

    if (endDate) {
      if (!date) return false;

      const eventTime = new Date(date).getTime();
      const inclusiveEnd = new Date(endDate);
      inclusiveEnd.setHours(23, 59, 59, 999);

      if (eventTime > inclusiveEnd.getTime()) {
        return false;
      }
    }

    if (maxPriceCents !== undefined) {
      const price = cheapestPrice(event);

      if (price === null || price > maxPriceCents) {
        return false;
      }
    }

    if (onlyAvailable && seatsAvailable(event) <= 0) {
      return false;
    }

    return true;
  });
}

export function sortEvents(summaries, sortBy = "date") {
  if (!["date", "price", "availability"].includes(sortBy)) {
    fail(`Unknown sort option: ${sortBy}`);
  }

  function compareText(a, b) {
    return String(a ?? "").localeCompare(String(b ?? ""));
  }

  return mergeSort(summaries, (a, b) => {
    let result = 0;

    if (sortBy === "date") {
      result = compareText(eventDate(a), eventDate(b));
    } else if (sortBy === "price") {
      const priceA = cheapestPrice(a);
      const priceB = cheapestPrice(b);

      if (priceA === null && priceB !== null) return 1;
      if (priceA !== null && priceB === null) return -1;

      result = (priceA ?? 0) - (priceB ?? 0);
    } else {
      result = seatsAvailable(b) - seatsAvailable(a);
    }

    return result || compareText(eventTitle(a), eventTitle(b)) ||
      compareText(a.id, b.id);
  });
}

export function searchEvents(summaries, criteria = {}, sortBy = "date") {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
