
import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  publishEvent,
} from "../src/domain/inventory.js";

import { DomainError } from "../src/domain/errors.js";

const store = createStore();

console.log("\n=== EVENT TICKETING DEMO ===\n");

// 1. Create an event and ticket tier.
const event = createEvent(store, {
  name: "NextGenSound Live In Concert",
});


const tier = addTier(store, event.id, {
  name: "Regular",
  priceCents: 5000,
  capacity: 3,
});

publishEvent(store, event.id);

console.log(`Event created: ${event.name}`);
console.log(`Ticket tier: ${tier.name}`);
console.log(`Capacity: ${tier.capacity}`);
console.log(`Ticket price: ₦${(tier.priceCents / 100).toFixed(2)}\n`);

// 2. Ada books two tickets.
const ada = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  customerName: "Ada",
  quantity: 2,
});

console.log(
  `${ada.customerName} booked ${ada.quantity} tickets. Reference: ${ada.reference}`
);

// 3. Bayo tries to book two tickets, but only one remains.
try {
  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    customerName: "Bayo",
    quantity: 2,
  });
} catch (error) {
  if (error instanceof DomainError && error.code === "SOLD_OUT") {
    console.log("\nBayo's booking was refused: SOLD_OUT.");
  } else {
    throw error;
  }
}

// 4. Cora books the final ticket.
const cora = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  customerName: "Cora",
  quantity: 1,
});

console.log(
  `${cora.customerName} booked the final ticket. Reference: ${cora.reference}`
);
console.log(`Tickets sold: ${tier.sold}/${tier.capacity}`);

// 5. Dara and Efe join the waitlist.
joinWaitlist(store, {
  eventId: event.id,
  tierId: tier.id,
  customerName: "Dara",
  quantity: 1,
});

joinWaitlist(store, {
  eventId: event.id,
  tierId: tier.id,
  customerName: "Efe",
  quantity: 1,
});

console.log("\nDara and Efe joined the waitlist in that order.");

// 6. Look up Ada's booking using its reference.
const found = findBookingByReference(store, ada.reference);
console.log(`Booking lookup: ${found.customerName} (${found.reference})`);

// 7. Ada cancels, releasing two tickets.
cancelBooking(store, ada.reference);
console.log(`\n${ada.customerName} cancelled. Tickets sold: ${tier.sold}/${tier.capacity}`);

// 8. Show the next person in the waitlist.
const key = JSON.stringify([event.id, tier.id]);
const queue = store.waitlists.get(key);
const next = queue?.peek();

console.log(
  next
    ? `Next person in the waitlist: ${next.customerName}`
    : "The waitlist is empty."
);

console.log("\n=== DEMO COMPLETE ===\n");
