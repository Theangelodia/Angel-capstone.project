# Event Ticketing Domain Core

A terminal-based event ticketing system built with JavaScript and Node.js.

## Features

- Create events and ticket tiers.
- Book tickets while enforcing capacity limits.
- Generate unique booking IDs and readable booking references.
- Cancel bookings and release ticket capacity.
- Find bookings by reference using a `Map`.
- Maintain a FIFO waitlist using a linked-list queue.
- Benchmark `Map.get()` against `Array.find()`.

## Requirements

- Node.js
- npm

## Getting Started

Install dependencies if needed:

```bash
npm install
```

Run the demonstration:

```bash
npm run demo
```

Run the lookup benchmark:

```bash
npm run benchmark
```

Run automated tests:

```bash
npm test
```

## Key Design Decisions

- Money is represented in whole cents to avoid floating-point currency calculations.
- Booking quantities must be between 1 and 10.
- A booking that exceeds available capacity is rejected without changing inventory.
- Booking references are indexed in a `Map` for average O(1) lookup.
- The waitlist uses a linked-list queue with O(1) enqueue and dequeue operations.

## Project Structure

- `src/domain/` — domain logic and utilities.
- `scripts/demo.js` — terminal demonstration.
- `scripts/benchmark-lookup.js` — booking lookup benchmark.
- `tests/` — automated tests.
- `docs/ai-log.md` — record of AI-assisted development.

## Build Status

Build 1 focuses on the domain core. It does not include a server or database.
