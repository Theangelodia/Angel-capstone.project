# Build 1: Domain Core in the Terminal

## Goal

Build the core domain logic for an event-ticketing system using JavaScript and Node.js. This build runs entirely in the terminal and does not require a server or database.

## Deliverables

- `src/domain/errors.js` — `DomainError` with a machine-readable error code.
- `src/domain/ids.js` — ID and booking-reference generation using `node:crypto`.
- `src/domain/waitlistQueue.js` — linked-list FIFO queue with O(1) enqueue, dequeue, peek, and size operations.
- `src/domain/inventory.js` — event, ticket-tier, booking, cancellation, lookup, and waitlist operations.
- `scripts/demo.js` — terminal demonstration of the booking lifecycle.
- `scripts/benchmark-lookup.js` — comparison of `Map.get()` and `Array.find()`.
- `tests/inventory.test.js` — automated tests for the domain rules.

## Business Rules

1. Booking quantities must be between 1 and 10.
2. A booking cannot exceed available ticket capacity.
3. A failed booking must not change inventory.
4. Ticket prices and booking totals use whole cents.
5. Cancelling a booking releases its ticket capacity.
6. A booking cannot be cancelled twice.
7. Booking references support direct lookup through a `Map`.
8. The waitlist follows first-in, first-out order.
9. Invalid inputs and domain failures use `DomainError` with machine-readable codes.
10. IDs and references use `node:crypto`, not `Math.random()`.

## Definition of Done

- [ ] `npm run demo` demonstrates an event selling out, a refused booking, waitlist entries, a cancellation, and the next person in the waitlist being named.
- [ ] `npm run benchmark` compares `Map.get()` with `Array.find()` over many bookings and displays timings.
- [ ] The Big O difference between the two lookup approaches can be explained.
- [ ] Automated tests pass.
- [ ] The first pull request is merged.

## Benchmark Explanation

`Array.find()` has O(n) time complexity because it may scan the array to find a matching booking. `Map.get()` provides average O(1) lookup by key. Actual benchmark timings depend on the machine and workload.

## Scope

Build 1 covers the terminal-based domain core only. It does not include a web server or database.

## Notes

The Build 1 demonstration, benchmark, and tests should be run before submitting the pull request. Review the instructor's original project documentation for any additional criteria.
