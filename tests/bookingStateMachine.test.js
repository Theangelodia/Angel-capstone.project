
import test from "node:test";
import assert from "node:assert/strict";

import {
  BOOKING_STATES,
  canTransition,
  assertTransition,
} from "../src/domain/bookingStateMachine.js";

const { PENDING, PAID, CANCELLED, REFUNDED, CHECKED_IN } =
  BOOKING_STATES;

test("allows every permitted booking transition", () => {
  const allowed = [
    [PENDING, PAID],
    [PENDING, CANCELLED],
    [PAID, CHECKED_IN],
    [PAID, REFUNDED],
    [PAID, CANCELLED],
  ];

  for (const [from, to] of allowed) {
    assert.equal(canTransition(from, to), true);
    assert.doesNotThrow(() => assertTransition(from, to));
  }
});

test("rejects every illegal transition between known states", () => {
  const states = Object.values(BOOKING_STATES);
  const allowed = new Set([
    `${PENDING}->${PAID}`,
    `${PENDING}->${CANCELLED}`,
    `${PAID}->${CHECKED_IN}`,
    `${PAID}->${REFUNDED}`,
    `${PAID}->${CANCELLED}`,
  ]);

  for (const from of states) {
    for (const to of states) {
      if (allowed.has(`${from}->${to}`)) continue;

      assert.equal(canTransition(from, to), false);
      assert.throws(
        () => assertTransition(from, to),
        (error) => error.code === "INVALID_TRANSITION",
      );
    }
  }
});

test("rejects unknown booking states", () => {
  assert.equal(canTransition("unknown", PENDING), false);

  assert.throws(
    () => assertTransition("unknown", PENDING),
    (error) => error.code === "INVALID_TRANSITION",
  );
});
