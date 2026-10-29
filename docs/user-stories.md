# Event Ticketing Capstone — User Stories

## Roles

- **Organizer:** Creates and manages events and ticket tiers.
- **Attendee:** Searches for events and books tickets.
- **Staff:** Supports event operations, including check-in.

## Build 2 Stories

### S02 — Create an Event

As an organizer, I want to create an event with a title, city, venue and date so that people can find it.

**Acceptance criteria**
1. A valid event is saved as a draft with a new ID and does not appear on the public list.
2. A missing title or city, or an invalid date, produces a `VALIDATION` error and saves nothing.

### S03 — Add Ticket Tiers

As an organizer, I want to add ticket tiers with a price and capacity so that I can sell different kinds of tickets.

**Acceptance criteria**
1. A General tier priced at 500000 kobo with capacity 100 is saved with zero tickets sold and 100 seats remaining.
2. A non-whole-number price or capacity below 1 produces `VALIDATION`.
3. An unknown event ID produces `NOT_FOUND`.

### S04 — Publish and Unpublish an Event

As an organizer, I want to publish and unpublish an event so that I control when it goes public.

**Acceptance criteria**
1. [Add the first criterion agreed upon in class.]
2. [Add the second criterion agreed upon in class.]
3. [Add the third criterion agreed upon in class.]

### S05 — Search, Filter and Sort Events

As an attendee, I want to search, filter and sort published events so that I can find an event I like.

**Acceptance criteria**
1. Searching for `JAZZ` matches titles or venues without case sensitivity.
2. Filtering by city `lagos` returns Lagos events regardless of capitalisation.
3. Filtering by maximum price uses the cheapest ticket tier, excludes events without tiers, and sorting by price puts the cheapest first.
4. Sorting by date puts earlier events first; events on the same day remain in title order.
5. Filtering through `2026-12-05` includes an event at 5 PM on that date.
6. An invalid date, non-whole-number price or unknown sort option produces `VALIDATION`.
7. Searching, filtering and sorting never modify the original list.

### S06 — Book Tickets

As an attendee, I want to book tickets from a tier so that I can reserve a place.

**Acceptance criteria**
1. Booking two tickets when three seats remain creates a pending booking for two tickets and leaves one seat.
2. Booking two tickets when only one seat remains produces `SOLD_OUT` and changes nothing.
3. A quantity of zero, negative, fractional or greater than 10 produces `VALIDATION`.

### S16 — Automated Tests

As a team, I want automated tests so that we notice breakage early.

**Build 2:** Running `npm test` executes the tests and fails if any test fails.

**Build 9:** A GitHub push automatically runs the tests and reports failures as a failed check.

## Definition of Done

For each story:
1. The rule works and has tests, including relevant edge cases.
2. The feature is reachable through the appropriate interface when applicable.
3. AI mistakes and corrections are recorded in `docs/ai-log.md`.
4. Changes are merged through a pull request.
