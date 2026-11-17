import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  buildMonthGrid,
  compareMonths,
  formatDayLabel,
  formatMonthLabel,
  getDayState,
  monthRange,
} from "./calendar.ts";

test("buildMonthGrid: weeks start on Monday", () => {
  // 1 Nov 2026 is a Sunday → six blanks before it
  const grid = buildMonthGrid({ year: 2026, month: 11 });
  assert.deepEqual(grid.slice(0, 7), [null, null, null, null, null, null, "2026-11-01"]);
  assert.equal(grid.length % 7, 0);
  assert.equal(grid.filter(Boolean).length, 30);
});

test("buildMonthGrid: month starting on Monday has no leading blanks", () => {
  // 1 Jun 2026 is a Monday
  const grid = buildMonthGrid({ year: 2026, month: 6 });
  assert.equal(grid[0], "2026-06-01");
});

test("buildMonthGrid: leap February", () => {
  const grid = buildMonthGrid({ year: 2028, month: 2 });
  assert.equal(grid.filter(Boolean).length, 29);
});

test("monthRange: first and last day", () => {
  assert.deepEqual(monthRange({ year: 2026, month: 2 }), {
    first: "2026-02-01",
    last: "2026-02-28",
  });
});

test("addMonths / compareMonths across year boundaries", () => {
  assert.deepEqual(addMonths({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  assert.deepEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.ok(compareMonths({ year: 2025, month: 12 }, { year: 2026, month: 1 }) < 0);
  assert.equal(compareMonths({ year: 2026, month: 3 }, { year: 2026, month: 3 }), 0);
});

test("getDayState: studied, frozen, missed, today", () => {
  const today = "2026-11-17";
  const first = "2026-11-03";
  assert.equal(getDayState("2026-11-10", today, first, 900, 900), "studied");
  assert.equal(getDayState("2026-11-10", today, first, 899, 900), "missed");
  assert.equal(getDayState("2026-11-10", today, first, 0, 900), "missed");
  assert.equal(getDayState("2026-11-10", today, first, 0, 900, true), "frozen");
  assert.equal(getDayState("2026-11-10", today, first, 1200, 900, true), "studied");
  assert.equal(getDayState("2026-11-17", today, first, 0, 900), "today");
  assert.equal(getDayState("2026-11-17", today, first, 1200, 900), "studied");
  assert.equal(getDayState("2026-11-18", today, first, 0, 900), "future");
  assert.equal(getDayState("2026-11-02", today, first, 0, 900), "before");
});

test("labels", () => {
  assert.equal(formatDayLabel("2026-08-06"), "August 6");
  assert.equal(formatMonthLabel({ year: 2026, month: 11 }), "November 2026");
});
