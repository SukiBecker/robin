import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStudyTime, isFreshStreakMilestone, todayInTimezone } from "./format.ts";

test("formatStudyTime: under an hour → minutes", () => {
  assert.equal(formatStudyTime(0, "today"), "0 min");
  assert.equal(formatStudyTime(59, "today"), "0 min");
  assert.equal(formatStudyTime(45 * 60, "today"), "45 min");
  assert.equal(formatStudyTime(59 * 60 + 59, "total"), "59 min");
});

test("formatStudyTime: hours and minutes", () => {
  assert.equal(formatStudyTime(2 * 3600 + 15 * 60, "today"), "2h 15m");
  assert.equal(formatStudyTime(99 * 3600 + 59 * 60, "total"), "99h 59m");
});

test("formatStudyTime: full hours drop the minutes", () => {
  assert.equal(formatStudyTime(3600, "today"), "1h");
  assert.equal(formatStudyTime(2 * 3600 + 30, "total"), "2h");
});

test("formatStudyTime: total from 100h on → whole hours only", () => {
  assert.equal(formatStudyTime(100 * 3600, "total"), "100 h");
  assert.equal(formatStudyTime(124 * 3600 + 40 * 60, "total"), "124 h");
});

test("isFreshStreakMilestone: milestone reached today", () => {
  assert.equal(isFreshStreakMilestone(7, "2026-11-02", "2026-11-02"), true);
  assert.equal(isFreshStreakMilestone(30, "2026-11-02", "2026-11-02"), true);
  assert.equal(isFreshStreakMilestone(100, "2026-11-02", "2026-11-02"), true);
});

test("isFreshStreakMilestone: milestone from yesterday, or no milestone", () => {
  assert.equal(isFreshStreakMilestone(7, "2026-11-01", "2026-11-02"), false);
  assert.equal(isFreshStreakMilestone(8, "2026-11-02", "2026-11-02"), false);
  assert.equal(isFreshStreakMilestone(0, null, "2026-11-02"), false);
});

test("todayInTimezone: buckets by the user's timezone, not UTC", () => {
  const lateEveningUtc = new Date("2026-11-02T23:30:00Z");
  assert.equal(todayInTimezone("UTC", lateEveningUtc), "2026-11-02");
  assert.equal(todayInTimezone("Europe/Berlin", lateEveningUtc), "2026-11-03");
});
