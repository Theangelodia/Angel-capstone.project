import {
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
} from "../domain/inventory.js";
import { searchEvents } from "../domain/eventSearch.js";

export function createEventService(repository) {
  return {
    async create(input) {
      const store = await repository.getStore();
      return createEvent(store, input);
    },

    async addTicketTier(eventId, input) {
      const store = await repository.getStore();
      return addTier(store, eventId, input);
    },

    async publish(eventId) {
      const store = await repository.getStore();
      return publishEvent(store, eventId);
    },

    async unpublish(eventId) {
      const store = await repository.getStore();
      return unpublishEvent(store, eventId);
    },

    async search(criteria = {}, sortBy = "date") {
      const store = await repository.getStore();

      const summaries = [...store.events.values()]
        .filter((event) => event.status === "published")
        .map((event) => ({
          id: event.id,
          title: event.title,
          name: event.name,
          city: event.city,
          venue: event.venue,
          date: event.date,
          status: event.status,
          tiers: [...event.tiers.values()],
        }));

      return searchEvents(summaries, criteria, sortBy);
    },
  };
}
