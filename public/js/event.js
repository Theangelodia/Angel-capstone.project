
import { getEvent, createBooking, pay } from "../api.js";
import { el } from "../ui.js";

const eventDetails = document.querySelector("#event-details");
const ticketList = document.querySelector("#ticket-list");
const checkoutSection = document.querySelector("#checkout-section");
const checkoutContent = document.querySelector("#checkout-content");

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const userId = "demo-user-001";

let selectedEvent = null;
let selectedTier = null;
let selectedQuantity = 1;
let currentBooking = null;
let countdownInterval = null;
let secondsRemaining = 300;

function formatPrice(priceCents) {
  if (priceCents === 0) return "Free";

  return `₦${(priceCents / 100).toLocaleString("en-NG")}`;
}

function renderEventDetails(event) {
  eventDetails.replaceChildren(
    el("section", { className: "event-hero" }, [
      el("p", { className: "event-category", text: event.category }),
      el("h1", { text: event.title }),
      el("p", { className: "event-description", text: event.description }),
      el("p", { text: `📍 ${event.venue}` }),
      el("p", { text: `📅 ${event.date} · ${event.time}` })
    ])
  );
}

function renderTickets() {
  ticketList.replaceChildren();

  for (const tier of selectedEvent.tiers) {
    const available = tier.capacity - tier.sold;
    const soldOut = available <= 0;

    const quantityInput = el("input", {
      type: "number",
      min: "1",
      max: String(Math.min(10, available)),
      value: "1",
      disabled: soldOut,
      id: `quantity-${tier.id}`
    });

    const quantityLabel = el("label", {
      htmlFor: quantityInput.id,
      text: "Quantity"
    });

    const selectButton = el("button", {
      className: "primary-button",
      type: "button",
      text: soldOut ? "Sold out" : "Choose tickets",
      disabled: soldOut,
      onClick: () => {
        const quantity = Number(quantityInput.value);

        if (
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          quantity > 10 ||
          quantity > available
        ) {
          alert("Choose a valid quantity within the available ticket limit.");
          return;
        }

        selectedTier = tier;
        selectedQuantity = quantity;
        renderCheckoutForm();
      }
    });

    const card = el("article", { className: "ticket-card" }, [
      el("div", {}, [
        el("h3", { text: tier.name }),
        el("p", {
          className: "ticket-price",
          text: formatPrice(tier.priceCents)
        }),
        el("p", {
          className: soldOut ? "sold-out" : "tickets-available",
          text: soldOut ? "Sold out" : `${available} tickets available`
        })
      ]),
      quantityLabel,
      quantityInput,
      selectButton
    ]);

    ticketList.appendChild(card);
  }
}

function renderCheckoutForm() {
  clearInterval(countdownInterval);

  checkoutSection.hidden = false;
  secondsRemaining = 300;

  const total = selectedTier.priceCents * selectedQuantity;

  const nameInput = el("input", {
    type: "text",
    id: "customer-name",
    name: "customerName",
    required: true,
    placeholder: "Enter your full name"
  });

  const nameLabel = el("label", {
    htmlFor: "customer-name",
    text: "Full name"
  });

  const form = el("form", {
    id: "booking-form",
    className: "checkout-form",
    onSubmit: async (event) => {
      event.preventDefault();

      const customerName = nameInput.value.trim();

      if (!customerName) {
        alert("Please enter your name.");
        return;
      }

      try {
        const booking = await createBooking(
          {
            eventId: selectedEvent.id,
            tierId: selectedTier.id,
            customerName,
            quantity: selectedQuantity
          },
          userId
        );

        currentBooking = booking;
        renderPaymentForm();
      } catch (error) {
        alert(error.message);
        renderTickets();
      }
    }
  }, [
    nameLabel,
    nameInput,
    el("p", {
      className: "checkout-total",
      text: `Total: ${formatPrice(total)}`
    }),
    el("button", {
      type: "submit",
      className: "primary-button",
      text: "Continue to payment"
    })
  ]);

  checkoutContent.replaceChildren(
    el("p", {
      text: `${selectedTier.name} × ${selectedQuantity}`
    }),
    form,
    el("p", {
      id: "countdown",
      className: "countdown",
      text: "Your tickets will be held for 05:00"
    })
  );

  startCountdown();
  checkoutSection.scrollIntoView({ behavior: "smooth" });
}

function startCountdown() {
  const countdown = document.querySelector("#countdown");

  countdownInterval = setInterval(() => {
    secondsRemaining -= 1;

    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    countdown.textContent =
      `Your tickets will be held for ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      countdown.textContent = "Your ticket hold has expired.";

      if (currentBooking?.status === "pending") {
        countdown.textContent +=
          " This demo does not automatically release expired bookings.";
      }
    }
  }, 1000);
}

function renderPaymentForm() {
  const declineCheckbox = el("input", {
    type: "checkbox",
    id: "simulate-decline"
  });

  const declineLabel = el("label", {
    htmlFor: "simulate-decline",
    text: "Simulate a declined card payment"
  });

  const paymentMessage = el("p", {
    id: "payment-message",
    className: "payment-message",
    text: "Your booking is pending. Complete your mock payment."
  });

  const payButton = el("button", {
    type: "button",
    className: "primary-button",
    text: "Pay now",
    onClick: async () => {
      payButton.disabled = true;
      paymentMessage.textContent = "Processing payment...";

      try {
        currentBooking = await pay(
          currentBooking.reference,
          userId,
          { shouldDecline: declineCheckbox.checked }
        );

        clearInterval(countdownInterval);

        paymentMessage.textContent =
          `Payment successful! Your booking reference is ${currentBooking.reference}.`;

        payButton.remove();
        declineCheckbox.disabled = true;
      } catch (error) {
        paymentMessage.textContent = error.message;
        payButton.disabled = false;
      }
    }
  });

  checkoutContent.append(
    el("h3", { text: "Mock card payment" }),
    declineLabel,
    declineCheckbox,
    payButton,
    paymentMessage
  );
}

async function initialisePage() {
  if (!eventId) {
    eventDetails.textContent = "No event was selected.";
    ticketList.replaceChildren();
    return;
  }

  try {
    selectedEvent = await getEvent(eventId);

    renderEventDetails(selectedEvent);
    renderTickets();
  } catch (error) {
    eventDetails.textContent = error.message;
  }
}

initialisePage();
