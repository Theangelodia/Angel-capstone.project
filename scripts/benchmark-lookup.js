
import { performance } from "node:perf_hooks";

const bookingCount = 100_000;
const lookupCount = 500;

const bookings = [];
const bookingsByReference = new Map();

for (let i = 0; i < bookingCount; i++) {
  const booking = {
    id: i,
    reference: `BK-${String(i).padStart(8, "0")}`,
  };

  bookings.push(booking);
  bookingsByReference.set(booking.reference, booking);
}

const references = Array.from(
  { length: lookupCount },
  (_, i) => `BK-${String(i * 199).padStart(8, "0")}`
);

let arrayFound = 0;
let mapFound = 0;

const arrayStart = performance.now();

for (const reference of references) {
  if (bookings.find((booking) => booking.reference === reference)) {
    arrayFound++;
  }
}

const arrayTime = performance.now() - arrayStart;

const mapStart = performance.now();

for (const reference of references) {
  if (bookingsByReference.get(reference)) {
    mapFound++;
  }
}

const mapTime = performance.now() - mapStart;

console.log(`Bookings: ${bookingCount.toLocaleString()}`);
console.log(`Lookups: ${lookupCount}`);
console.log(
  `Array.find(): ${arrayTime.toFixed(3)} ms (${arrayFound} found)`
);
console.log(
  `Map.get():    ${mapTime.toFixed(3)} ms (${mapFound} found)`
);
