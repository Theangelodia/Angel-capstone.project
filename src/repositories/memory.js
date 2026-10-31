import { createStore } from "../domain/inventory.js";

export function createMemoryRepository() {
  const store = createStore();

  return {
    async getStore() {
      return store;
    },

    async saveEvent(event) {
      store.events.set(event.id, event);
      return event;
    },

    async findEventById(id) {
      return store.events.get(id) ?? null;
    },

    async findAllEvents() {
      return [...store.events.values()];
    },

    async saveTier(eventId, tier) {
      const event = store.events.get(eventId);
      if (!event) return null;
      event.tiers.set(tier.id, tier);
      return tier;
    },

    async findTierById(eventId, tierId) {
      return store.events.get(eventId)?.tiers.get(tierId) ?? null;
    },

    async findTiersByEventId(eventId) {
      return [...(store.events.get(eventId)?.tiers.values() ?? [])];
    },

    async saveBooking(booking) {
      store.bookingsById.set(booking.id, booking);
      store.bookingsByReference.set(booking.reference, booking);
      return booking;
    },

    async findBookingByReference(reference) {
      return store.bookingsByReference.get(reference) ?? null;
    },
  };
}