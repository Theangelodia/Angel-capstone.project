export function createMockPaymentGateway() {
  return {
    async charge({ shouldDecline = false } = {}) {
      if (shouldDecline) {
        return {
          success: false,
          message: "Payment was declined.",
        };
      }

      return {
        success: true,
        transactionReference: `MOCK-${Date.now()}`,
      };
    },
  };
}
