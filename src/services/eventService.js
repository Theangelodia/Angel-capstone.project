
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
} from "../domain/inventory.js";

import { searchEvents } from "../domain/eventSearch.js";

export function createEventService(repository) {
  return {
    async create(input) {
      const store = createStore();
      const event = createEvent(store, input);

      return repository.saveEvent(event);
    },

    async addTicketTier(eventId, input) {
      const event = await repository.getEventById(eventId);
      const store = createStore();

      if (event) {
        store.events.set(event.id, event);
      }

      const tier = addTier(store, eventId, input);

      return repository.saveTier(eventId, tier);
    },

    async publish(eventId) {
      const event = await repository.getEventById(eventId);
      const store = createStore();

      if (event) {
        store.events.set(event.id, event);
      }

      const publishedEvent = publishEvent(store, eventId);

      return repository.updateEventStatus(
        eventId,
        publishedEvent.status,
      );
    },

    async unpublish(eventId) {
      const event = await repository.getEventById(eventId);
      const store = createStore();

      if (event) {
        store.events.set(event.id, event);
      }

      const unpublishedEvent = unpublishEvent(store, eventId);

      return repository.updateEventStatus(
        eventId,
        unpublishedEvent.status,
      );
    },

    async search(criteria = {}, sortBy = "date") {
      const events = await repository.findAllEvents();

      const summaries = events
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

