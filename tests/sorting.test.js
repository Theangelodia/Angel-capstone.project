
import test from "node:test";
import assert from "node:assert/strict";
import { mergeSort } from "../src/domain/sorting.js";

test("mergeSort sorts numbers without changing the original array", () => {
  const numbers = [5, 2, 8, 1, 3];

  const result = mergeSort(numbers, (a, b) => a - b);

  assert.deepEqual(result, [1, 2, 3, 5, 8]);
  assert.deepEqual(numbers, [5, 2, 8, 1, 3]);
  assert.notStrictEqual(result, numbers);
});

test("mergeSort preserves the order of equal items", () => {
  const items = [
    { name: "First", score: 2 },
    { name: "Second", score: 1 },
    { name: "Third", score: 2 },
  ];

  const result = mergeSort(items, (a, b) => a.score - b.score);

  assert.deepEqual(
    result.map((item) => item.name),
    ["Second", "First", "Third"]
  );
});

test("mergeSort handles an empty array", () => {
  const result = mergeSort([], (a, b) => a - b);

  assert.deepEqual(result, []);
});
