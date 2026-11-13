import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createDatabase } from "../src/db/connection.js";
import { createSQLiteRepository } from "../src/repositories/sqlite.js";

test("SQLite repository saves and retrieves an event and ticket tier", async () => {
  const database = createDatabase(":memory:");
  const repository = createSQLiteRepository(database);

  try {
    const event = {
      id: "event-001",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await repository.saveEvent(event);

    const tier = {
      id: "tier-001",
      name: "Regular",
      priceCents: 500000,
      capacity: 100,
      sold: 0,
    };

    await repository.saveTier(event.id, tier);

    const savedEvent = await repository.getEventById(event.id);
    const savedTier = await repository.findTierById(event.id, tier.id);

    assert.equal(savedEvent.id, event.id);
    assert.equal(savedEvent.title, event.title);
    assert.equal(savedEvent.city, event.city);
    assert.equal(savedEvent.status, "published");

    assert.equal(savedTier.id, tier.id);
    assert.equal(savedTier.name, "Regular");
    assert.equal(savedTier.priceCents, 500000);
    assert.equal(savedTier.capacity, 100);
    assert.equal(savedTier.sold, 0);
  } finally {
    database.close();
  }
});


test("SQLite repository creates a booking and reduces ticket inventory", async () => {
  const database = createDatabase(":memory:");
  const repository = createSQLiteRepository(database);

  try {
    const event = {
      id: "event-002",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await repository.saveEvent(event);

    const tier = {
      id: "tier-002",
      name: "Regular",
      priceCents: 500000,
      capacity: 100,
      sold: 0,
    };

    await repository.saveTier(event.id, tier);

    const booking = await repository.createBooking(
      {
        eventId: event.id,
        tierId: tier.id,
        customerName: "Angel",
        quantity: 3,
      },
      "user-001",
    );

    const updatedTier = await repository.findTierById(event.id, tier.id);
    const savedBooking = await repository.findBookingByReference(
      booking.reference,
    );

    assert.equal(booking.quantity, 3);
    assert.equal(booking.totalCents, 1500000);
    assert.equal(booking.status, "pending");
    assert.equal(booking.userId, "user-001");

    assert.equal(updatedTier.sold, 3);
    assert.equal(savedBooking.reference, booking.reference);
    assert.equal(savedBooking.customerName, "Angel");
  } finally {
    database.close();
  }
});
test("SQLite repository prevents overselling and preserves inventory", async () => {
  const database = createDatabase(":memory:");
  const repository = createSQLiteRepository(database);

  try {
    const event = {
      id: "event-003",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await repository.saveEvent(event);

    const tier = {
      id: "tier-003",
      name: "Regular",
      priceCents: 500000,
      capacity: 2,
      sold: 0,
    };

    await repository.saveTier(event.id, tier);

    await assert.rejects(
      repository.createBooking(
        {
          eventId: event.id,
          tierId: tier.id,
          customerName: "Angel",
          quantity: 3,
        },
        "user-003",
      ),
      { code: "SOLD_OUT" },
    );

    const updatedTier = await repository.findTierById(event.id, tier.id);

    assert.equal(updatedTier.sold, 0);
  } finally {
    database.close();
  }
});


test("SQLite repository cancellation restores ticket inventory", async () => {
  const database = createDatabase(":memory:");
  const repository = createSQLiteRepository(database);

  try {
    const event = {
      id: "event-004",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await repository.saveEvent(event);

    const tier = {
      id: "tier-004",
      name: "Regular",
      priceCents: 500000,
      capacity: 10,
      sold: 0,
    };

    await repository.saveTier(event.id, tier);

    const booking = await repository.createBooking(
      {
        eventId: event.id,
        tierId: tier.id,
        customerName: "Angel",
        quantity: 3,
      },
      "user-004",
    );

    await repository.cancelBooking(booking.reference);

    const cancelledBooking = await repository.findBookingByReference(
      booking.reference,
    );

    const updatedTier = await repository.findTierById(event.id, tier.id);

    assert.equal(cancelledBooking.status, "cancelled");
    assert.equal(updatedTier.sold, 0);

    await assert.rejects(
      repository.cancelBooking(booking.reference),
      { code: "ALREADY_CANCELLED" },
    );
  } finally {
    database.close();
  }
});


test("SQLite repository marks a pending booking as paid", async () => {
  const database = createDatabase(":memory:");
  const repository = createSQLiteRepository(database);

  try {
    const event = {
      id: "event-005",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await repository.saveEvent(event);

    const tier = {
      id: "tier-005",
      name: "Regular",
      priceCents: 500000,
      capacity: 10,
      sold: 0,
    };

    await repository.saveTier(event.id, tier);

    const booking = await repository.createBooking(
      {
        eventId: event.id,
        tierId: tier.id,
        customerName: "Angel",
        quantity: 2,
      },
      "user-005",
    );

    const paidBooking = await repository.markBookingAsPaid(
      booking.reference,
      "TXN-12345",
    );

    assert.equal(paidBooking.status, "paid");
    assert.equal(paidBooking.transactionReference, "TXN-12345");

    await assert.rejects(
      repository.markBookingAsPaid(booking.reference, "TXN-67890"),
      { code: "INVALID_TRANSITION" },
    );
  } finally {
    database.close();
  }
});


test("SQLite database preserves events and ticket tiers after reopening", async () => {
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), "event-ticketing-"),
  );

  const databasePath = path.join(temporaryDirectory, "test.sqlite");

  try {
    // First connection: save the event and ticket tier.
    const firstDatabase = createDatabase(databasePath);
    const firstRepository = createSQLiteRepository(firstDatabase);

    const event = {
      id: "event-006",
      title: "NextGenSound Live In Concert",
      name: "NextGenSound Live In Concert",
      city: "Lagos",
      venue: "Lagos State University",
      date: "2027-03-15",
      status: "published",
      tiers: new Map(),
    };

    await firstRepository.saveEvent(event);

    const tier = {
      id: "tier-006",
      name: "Regular",
      priceCents: 500000,
      capacity: 100,
      sold: 0,
    };

    await firstRepository.saveTier(event.id, tier);

    firstDatabase.close();

    // Second connection: retrieve the saved records.
    const secondDatabase = createDatabase(databasePath);
    const secondRepository = createSQLiteRepository(secondDatabase);

    try {
      const savedEvent = await secondRepository.getEventById(event.id);
      const savedTier = await secondRepository.findTierById(
        event.id,
        tier.id,
      );

      assert.equal(savedEvent.title, event.title);
      assert.equal(savedEvent.status, "published");
      assert.equal(savedTier.name, "Regular");
      assert.equal(savedTier.capacity, 100);
    } finally {
      secondDatabase.close();
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
