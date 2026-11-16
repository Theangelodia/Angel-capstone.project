
import { listEvents } from "../api.js";
import { el } from "../ui.js";

const eventsList = document.querySelector("#events-list");
const filterForm = document.querySelector("#filter-form");
const eventCount = document.querySelector("#event-count");

function formatPrice(priceCents) {
  if (priceCents === 0) return "Free";
  return `₦${(priceCents / 100).toLocaleString("en-NG")}`;
}

function createEventCard(event) {
  const cheapestPrice = Math.min(
    ...event.tiers.map((tier) => tier.priceCents)
  );

  return el("article", { className: "event-card" }, [
    el("div", { className: "event-card-content" }, [
      el("p", { className: "event-category", text: event.category }),
      el("h3", { text: event.title }),
      el("p", { className: "event-description", text: event.description }),
      el("p", { className: "event-location", text: `📍 ${event.venue}` }),
      el("p", { className: "event-date", text: `📅 ${event.date} · ${event.time}` }),
      el("div", { className: "event-card-footer" }, [
        el("p", {
          className: "event-price",
          text: `From ${formatPrice(cheapestPrice)}`
        }),
        el("a", {
          className: "primary-button",
          href: `./event.html?id=${encodeURIComponent(event.id)}`,
          text: "View event"
        })
      ])
    ])
  ]);
}

async function renderEvents() {
  eventsList.replaceChildren(el("p", { text: "Loading events..." }));

  try {
    const formData = new FormData(filterForm);

    const criteria = {
      q: formData.get("q").trim(),
      city: formData.get("city") || undefined,
      onlyAvailable: formData.get("onlyAvailable") === "on"
    };

    const maxPrice = formData.get("maxPrice");

    if (maxPrice !== "") {
      const naira = Number(maxPrice);

      if (!Number.isSafeInteger(naira) || naira < 0) {
        throw new Error("Enter a valid whole-number maximum price.");
      }

      criteria.maxPriceCents = naira * 100;
    }

    const sortBy = formData.get("sort") || "date";
    const events = await listEvents(criteria, sortBy);

    eventsList.replaceChildren();

    eventCount.textContent =
      `${events.length} event${events.length === 1 ? "" : "s"} found`;

    if (events.length === 0) {
      eventsList.appendChild(el("p", {
        className: "empty-state",
        text: "No events match your filters. Try changing your search."
      }));
      return;
    }

    for (const event of events) {
      eventsList.appendChild(createEventCard(event));
    }
  } catch (error) {
    eventsList.replaceChildren(el("p", {
      className: "error-message",
      text: error.message
    }));

    eventCount.textContent = "";
    console.error("Unable to load events:", error);
  }
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  renderEvents();
});

filterForm.addEventListener("reset", () => {
  setTimeout(renderEvents, 0);
});

renderEvents();
