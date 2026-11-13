
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    venue TEXT NOT NULL,
    event_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published'))
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    sold INTEGER NOT NULL DEFAULT 0,
    CHECK (sold >= 0 AND sold <= capacity),

    UNIQUE (event_id, id),

    FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    event_id TEXT NOT NULL,
    tier_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'paid',
                'cancelled',
                'refunded',
                'checked_in'
            )
        ),
    transaction_reference TEXT,

    FOREIGN KEY (event_id, tier_id)
        REFERENCES ticket_tiers(event_id, id)
);

CREATE INDEX IF NOT EXISTS idx_tiers_event
    ON ticket_tiers(event_id);

CREATE INDEX IF NOT EXISTS idx_bookings_event
    ON bookings(event_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user
    ON bookings(user_id);
