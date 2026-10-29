# Build 2: Event Search, Sorting, Backlog, First Tests

**Course week:** 5  
**Starting point:** Completed Build 1

## Objectives

Implement event searching, filtering and sorting; document user stories and acceptance criteria; and introduce automated tests.

### Deliverables

- Search and filter events by text, city, date range and price.
- Sort events by date, price and availability using a self-written merge sort.
- Document the backlog as user stories with acceptance criteria.
- Add automated tests using Node.js built-in testing tools.

## Definition of Done

- Searching, filtering and sorting work without modifying the original list.
- Every user story being implemented has acceptance criteria.
- `npm test` runs and passes.
- Tests cover expected behaviour, edge cases and relevant error codes.
- Changes are reviewed and merged through a pull request.
- AI mistakes and corrections are recorded in `docs/ai-log.md`.

## User Stories

### S02: Create an Event

As an organizer, I want to create an event with a title, city, venue and date so that people can find it.

**Acceptance criteria**

1. A valid event is saved as a draft with a new ID and does not appear on the public list.
2. A missing title or city, or an invalid date, produces a `VALIDATION` error and saves nothing.

### S03: Add Ticket Tiers

As an organizer, I want to add ticket tiers with a price and capacity so that I can sell different kinds of tickets.

**Acceptance criteria**

1. Adding a General tier priced at 500000 kobo with capacity 100 saves it with zero tickets sold and 100 seats remaining.
2. A non-whole-number price or capacity below 1 produces a `VALIDATION` error.
3. Adding a tier to a nonexistent event produces a `NOT_FOUND` error.

### S04: As an organizer, I want to publish and unpublish an event, so that I control when it goes public

**Proposed acceptance criteria**

1. **Publishing an event with ticket tiers**
   - Given a draft event with at least one ticket tier,
   - When the organizer publishes the event,
   - Then the event status changes to `published` and the event appears in the public event list.

2. **Preventing publication without ticket tiers**
   - Given a draft event with no ticket tiers,
   - When the organizer tries to publish it,
   - Then the request is rejected with `INVALID_STATE` and the event remains a draft.

3. **Unpublishing an event**
   - Given a published event,
   - When the organizer unpublishes it,
   - Then the event status changes to `draft` and it no longer appears in the public event list.


### S05: Search, Filter and Sort Events

As an attendee, I want to search, filter and sort published events so that I can find an event I like.

**Acceptance criteria**

1. Searching for `JAZZ` matches event titles or venues without case sensitivity.
2. Filtering by city `lagos` returns Lagos events regardless of capitalisation.
3. Filtering by maximum price uses the cheapest ticket tier, excludes events without tiers, and sorting by price puts the cheapest first.
4. Sorting by date puts earlier events first; events on the same day remain in title order.
5. Filtering through `2026-12-05` includes an event taking place at 5 PM on that date.
6. An invalid date, a price that is not a whole number, or an unknown sort option produces a `VALIDATION` error.
7. Searching, filtering and sorting never modify the original list.

### S06: Book Tickets

As an attendee, I want to book tickets from a tier so that I can reserve a place.

**Acceptance criteria**

1. Booking two tickets when three seats remain creates a pending booking for two tickets, uses whole-cent prices and leaves one seat.
2. Booking two tickets when only one seat remains produces a `SOLD_OUT` error and changes nothing.
3. A quantity of zero, a negative quantity, a fractional quantity or a quantity above 10 produces a `VALIDATION` error.

### S16: Automated Tests

As a team, I want automated tests so that we notice breakage early.

**Build 2 acceptance criterion**

Running `npm test` executes the test suite and returns a failing status if any test fails.

**Build 9 acceptance criterion**

A push to GitHub automatically runs `npm test`, and failing tests appear as a failed check. This automated workflow is planned for Build 9, not required for Build 2.

## Implementation Requirements

### Sorting

Create `src/domain/sorting.js` with `mergeSort(items, compare)`.

- Implement merge sort without using `Array.prototype.sort`.
- Preserve the original order of equal elements (stable sorting).
- Return a new array without mutating the input.

### Inventory

Add `publishEvent(store, eventId)` and `listEventSummaries(store, { publishedOnly = true })` to the inventory domain.

- Publishing an event with no ticket tiers produces an `INVALID_STATE` error.
- Draft events remain hidden from the default public listing.

### Event Search

Create `src/domain/eventSearch.js` with pure functions:

- `filterEvents(summaries, criteria)`
- `sortEvents(summaries, sortBy)`
- `searchEvents(summaries, criteria, sortBy)`

Filtering must support text, city, inclusive date ranges, maximum price and availability. Date-only upper limits must include the whole day. Invalid dates and non-whole-number prices must produce `VALIDATION` errors.

Sorting must support:

- `date`: earliest first.
- `price`: cheapest first, with events without prices last.
- `availability`: most seats remaining first.

Break sorting ties by title, then ID. Use the custom merge sort.

### Testing

Use `node:test` and `node:assert/strict`. Add tests covering the acceptance criteria for S02, S03, S04, S05 and S06.

Include tests for empty lists, stable sorting, unchanged input lists and relevant error codes.

Add an `npm test` script to `package.json`.

## General Rules

- Money values must use whole cents.
- Dates must use ISO strings.
- Domain errors must be `DomainError` instances with machine-readable codes.
- Functions must not mutate their input lists.
- Do not break existing Build 1 functionality.

## AI Log

Record mistakes made by AI assistance, how they were identified, and how they were corrected in `docs/ai-log.md`.


### S04: As an organizer, I want to publish and unpublish an event, so that I control when it goes public

**Proposed acceptance criteria**

1. **Publishing an event with ticket tiers**
   - Given a draft event with at least one ticket tier,
   - When the organizer publishes the event,
   - Then the event status changes to `published` and the event appears in the public event list.

2. **Preventing publication without ticket tiers**
   - Given a draft event with no ticket tiers,
   - When the organizer tries to publish it,
   - Then the request is rejected with `INVALID_STATE` and the event remains a draft.

3. **Unpublishing an event**
   - Given a published event,
   - When the organizer unpublishes it,
   - Then the event status changes to `draft` and it no longer appears in the public event list.
