import {
  bookTickets,
  cancelBooking,
  findBookingByReference,
} from "../domain/inventory.js";

import { assertTransition } from "../domain/bookingStateMachine.js";
import { DomainError } from "../domain/errors.js";

export function createBookingService(repository, paymentGateway) {
  return {
    async book(input, userId) {
      if (!userId || typeof userId !== "string") {
        throw new DomainError("User ID is required.", "UNAUTHORIZED");
      }

      const store = await repository.getStore();

      const booking = bookTickets(store, input);
      booking.userId = userId;

      return booking;
    },

    async pay(reference, userId, options = {}) {
      const store = await repository.getStore();
      const booking = findBookingByReference(store, reference);

      if (!booking) {
        throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
      }

      if (booking.userId !== userId) {
        throw new DomainError(
          "You cannot pay for another user's booking.",
          "FORBIDDEN",
        );
      }

      assertTransition(booking.status, "paid");

      const result = await paymentGateway.charge(options);

      if (!result.success) {
        throw new DomainError(
          result.message,
          "PAYMENT_DECLINED",
        );
      }

      booking.status = "paid";
      booking.transactionReference = result.transactionReference;

      return booking;
    },

    async cancel(reference, userId) {
      const store = await repository.getStore();
      const booking = findBookingByReference(store, reference);

      if (!booking) {
        throw new DomainError("Booking not found.", "BOOKING_NOT_FOUND");
      }

      if (booking.userId !== userId) {
        throw new DomainError(
          "You cannot cancel another user's booking.",
          "FORBIDDEN",
        );
      }

      assertTransition(booking.status, "cancelled");

      return cancelBooking(store, reference);
    },
  };
}