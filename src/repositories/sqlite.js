
import { DomainError } from "../domain/errors.js";
import { newId, newReference } from "../domain/ids.js";

function mapTier(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    capacity: row.capacity,
    sold: row.sold,
  };
}

function mapBooking(row) {
  if (!row) return null;

  return {
    id: row.id,
    reference: row.reference,
    eventId: row.event_id,
    tierId: row.tier_id,
    userId: row.user_id,
    customerName: row.customer_name,
    quantity: row.quantity,
    totalCents: row.total_cents,
    status: row.status,
    transactionReference: row.transaction_reference,
  };
}

function mapEvent(row, tiers = []) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    name: row.name,
    city: row.city,
    venue: row.venue,
    date: row.event_date,
    status: row.status,
    tiers: new Map(tiers.map((tier) => [tier.id, tier])),
  };
}

export function createSQLiteRepository(database) {
  if (!database) {
    throw new TypeError("A SQLite database connection is required.");
  }

  const statements = {
    findEvent: database.prepare(
      "SELECT * FROM events WHERE id = ?",
    ),

    findTier: database.prepare(
      "SELECT * FROM ticket_tiers WHERE event_id = ? AND id = ?",
    ),

    findBooking: database.prepare(
      "SELECT * FROM bookings WHERE reference = ?",
    ),

    findTiers: database.prepare(
      "SELECT * FROM ticket_tiers WHERE event_id = ? ORDER BY rowid",
    ),

    findEvents: database.prepare(
      "SELECT * FROM events ORDER BY event_date",
    ),
  };

  function getEvent(eventId) {
    const row = statements.findEvent.get(eventId);

    if (!row) {
      throw new DomainError("Event not found.", "NOT_FOUND");
    }

    const tiers = statements.findTiers.all(eventId).map(mapTier);

    return mapEvent(row, tiers);
  }

  return {
    async getEventById(eventId) {
      const row = statements.findEvent.get(eventId);

      if (!row) return null;

      const tiers = statements.findTiers.all(eventId).map(mapTier);

      return mapEvent(row, tiers);
    },

    async findEventById(eventId) {
      return this.getEventById(eventId);
    },

    async findTierById(eventId, tierId) {
      return mapTier(statements.findTier.get(eventId, tierId));
    },

    async findTiersByEventId(eventId) {
      return statements.findTiers.all(eventId).map(mapTier);
    },

    async findBookingByReference(reference) {
      return mapBooking(statements.findBooking.get(reference));
    },

    async findAllEvents() {
      return statements.findEvents.all().map((row) => {
        const tiers = statements.findTiers.all(row.id).map(mapTier);
        return mapEvent(row, tiers);
      });
    },
    
    async saveEvent(event) {
      database.prepare(`
        INSERT INTO events (
          id, title, name, city, venue, event_date, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.id,
        event.title,
        event.name,
        event.city,
        event.venue,
        event.date,
        event.status,
      );

      return event;
    },

    async saveTier(eventId, tier) {
      const event = statements.findEvent.get(eventId);

      if (!event) return null;

      database.prepare(`
        INSERT INTO ticket_tiers (
          id, event_id, name, price_cents, capacity, sold
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        tier.id,
        eventId,
        tier.name,
        tier.priceCents,
        tier.capacity,
        tier.sold,
      );

      return tier;
    },
    
    async updateEventStatus(eventId, status) {
      const result = database.prepare(`
        UPDATE events
        SET status = ?
        WHERE id = ?
      `).run(status, eventId);

      if (Number(result.changes) !== 1) {
        throw new DomainError("Event not found.", "NOT_FOUND");
      }

      return getEvent(eventId);
    },

    
    async createBooking(input, userId) {
      const { eventId, tierId, customerName, quantity } = input;

      if (typeof userId !== "string" || !userId.trim()) {
        throw new DomainError("User ID is required.", "UNAUTHORIZED");
      }

      if (typeof customerName !== "string" || !customerName.trim()) {
        throw new DomainError("customerName must be a non-empty string.");
      }

      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError("Quantity must be between 1 and 10.");
      }

      database.exec("BEGIN IMMEDIATE");

      try {
        const eventRow = statements.findEvent.get(eventId);

        if (!eventRow) {
          throw new DomainError("Event not found.", "NOT_FOUND");
        }

        if (eventRow.status !== "published") {
          throw new DomainError(
            "Tickets can only be booked for published events.",
            "INVALID_STATE",
          );
        }

        const tierRow = statements.findTier.get(eventId, tierId);

        if (!tierRow) {
          throw new DomainError("Ticket tier not found.", "TIER_NOT_FOUND");
        }

        if (tierRow.capacity - tierRow.sold < quantity) {
          throw new DomainError(
            "Not enough tickets are available.",
            "SOLD_OUT",
          );
        }

        const totalCents = tierRow.price_cents * quantity;

        if (!Number.isSafeInteger(totalCents)) {
          throw new DomainError("Booking total exceeds the supported money range.");
        }

        const update = database.prepare(`
          UPDATE ticket_tiers
          SET sold = sold + ?
          WHERE id = ?
            AND event_id = ?
            AND sold + ? <= capacity
        `).run(quantity, tierId, eventId, quantity);

        if (Number(update.changes) !== 1) {
          throw new DomainError(
            "Not enough tickets are available.",
            "SOLD_OUT",
          );
        }

        const booking = {
          id: newId(),
          reference: newReference(),
          eventId,
          tierId,
          userId,
          customerName: customerName.trim(),
          quantity,
          totalCents,
          status: "pending",
          transactionReference: null,
        };

        database.prepare(`
          INSERT INTO bookings (
            id, reference, event_id, tier_id, user_id,
            customer_name, quantity, total_cents, status,
            transaction_reference
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          booking.id,
          booking.reference,
          booking.eventId,
          booking.tierId,
          booking.userId,
          booking.customerName,
          booking.quantity,
          booking.totalCents,
          booking.status,
          booking.transactionReference,
        );

        database.exec("COMMIT");

        return booking;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    async markBookingAsPaid(reference, transactionReference) {
      const result = database.prepare(`
        UPDATE bookings
        SET status = 'paid',
            transaction_reference = ?
        WHERE reference = ?
          AND status = 'pending'
      `).run(transactionReference, reference);

      if (Number(result.changes) !== 1) {
        const booking = statements.findBooking.get(reference);

        if (!booking) {
          throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
        }

        throw new DomainError(
          "Booking cannot be paid in its current state.",
          "INVALID_TRANSITION",
        );
      }

      return mapBooking(statements.findBooking.get(reference));
    },

    async cancelBooking(reference) {
      database.exec("BEGIN IMMEDIATE");

      try {
        const bookingRow = statements.findBooking.get(reference);

        if (!bookingRow) {
          throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
        }

        if (bookingRow.status === "cancelled") {
          throw new DomainError(
            "This booking has already been cancelled.",
            "ALREADY_CANCELLED",
          );
        }

        const tierRow = statements.findTier.get(
          bookingRow.event_id,
          bookingRow.tier_id,
        );

        if (!tierRow || tierRow.sold < bookingRow.quantity) {
          throw new DomainError(
            "Inventory is inconsistent; cancellation cannot proceed.",
            "INVENTORY_ERROR",
          );
        }

        database.prepare(`
          UPDATE ticket_tiers
          SET sold = sold - ?
          WHERE id = ?
            AND event_id = ?
            AND sold >= ?
        `).run(
          bookingRow.quantity,
          bookingRow.tier_id,
          bookingRow.event_id,
          bookingRow.quantity,
        );

        database.prepare(`
          UPDATE bookings
          SET status = 'cancelled'
          WHERE reference = ?
        `).run(reference);

        database.exec("COMMIT");

        return mapBooking(statements.findBooking.get(reference));
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

  };
}
