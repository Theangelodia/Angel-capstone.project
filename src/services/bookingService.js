
import { assertTransition } from "../domain/bookingStateMachine.js";
import { DomainError } from "../domain/errors.js";

export function createBookingService(repository, paymentGateway) {
  return {
    async book(input, userId) {
      if (!userId || typeof userId !== "string") {
        throw new DomainError("User ID is required.", "UNAUTHORIZED");
      }

      return repository.createBooking(input, userId);
    },

    async pay(reference, userId, options = {}) {
      const booking = await repository.findBookingByReference(reference);

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
        throw new DomainError(result.message, "PAYMENT_DECLINED");
      }

      return repository.markBookingAsPaid(
        reference,
        result.transactionReference,
      );
    },

    async cancel(reference, userId) {
      const booking = await repository.findBookingByReference(reference);

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

      return repository.cancelBooking(reference);
    },
  };
}
