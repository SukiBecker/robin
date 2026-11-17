import { test } from "node:test";
import assert from "node:assert/strict";
import { formatWeekStart, isoWeek, lastWeekStarts, mondayOf } from "./weeks.ts";

test("mondayOf: weeks start on Monday", () => {
  assert.equal(mondayOf("2026-11-17"), "2026-11-16"); // Tuesday
  assert.equal(mondayOf("2026-11-16"), "2026-11-16"); // Monday
  assert.equal(mondayOf("2026-11-22"), "2026-11-16"); // Sunday
  assert.equal(mondayOf("2026-11-01"), "2026-10-26"); // across a month
});

test("lastWeekStarts: newest first", () => {
  assert.deepEqual(lastWeekStarts("2026-11-17", 4), [
    "2026-11-16",
    "2026-11-09",
    "2026-11-02",
    "2026-10-26",
  ]);
});

test("isoWeek and label", () => {
  assert.equal(isoWeek("2026-11-16"), 47);
  assert.equal(isoWeek("2025-12-29"), 1); // ISO week 1 of 2026
  assert.equal(formatWeekStart("2026-11-09"), "Nov 9");
});
