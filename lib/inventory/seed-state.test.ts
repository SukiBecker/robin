import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGrowthDuration, isSeedState } from "./seed-state.ts";

test("isSeedState: flower, grown → full image", () => {
  assert.equal(isSeedState({ category: "flower" }, { is_grown: true }), false);
});

test("isSeedState: flower, not grown → seed packet", () => {
  assert.equal(isSeedState({ category: "flower" }, { is_grown: false }), true);
});

test("isSeedState: plant, not grown → seed packet", () => {
  assert.equal(isSeedState({ category: "plant" }, { is_grown: false }), true);
});

test("isSeedState: decoration is never a seed (is_grown is always false)", () => {
  assert.equal(
    isSeedState({ category: "decoration" }, { is_grown: false }),
    false
  );
});

test("isSeedState: tree grows over the streak, no seed state", () => {
  assert.equal(isSeedState({ category: "tree" }, { is_grown: false }), false);
});

test("isSeedState: extra is not placeable, normal image", () => {
  assert.equal(isSeedState({ category: "extra" }, { is_grown: false }), false);
});

test("isSeedState: missing category → normal image", () => {
  assert.equal(isSeedState({ category: null }, { is_grown: false }), false);
});

test("formatGrowthDuration: long and short styles", () => {
  assert.equal(formatGrowthDuration(10800), "3 h");
  assert.equal(formatGrowthDuration(2700), "45 min");
  assert.equal(formatGrowthDuration(5400), "1 h 30 min");
  assert.equal(formatGrowthDuration(5400, "short"), "1h 30m");
  assert.equal(formatGrowthDuration(300, "short"), "5m");
  assert.equal(formatGrowthDuration(20, "short"), "1m");
  assert.equal(formatGrowthDuration(187200), "2 d 4 h");
});
