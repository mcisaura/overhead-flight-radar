import assert from "node:assert/strict";
import { test } from "node:test";
import { AIRLABS_BUDGET_WINDOW_MS, reserveBudgetWindow } from "../lib/airlabs-budget-window";

test("the shared budget admits only its configured number of calls", () => {
  const now = 1_000_000;
  const first = reserveBudgetWindow([], now, 2);
  const second = reserveBudgetWindow(first.timestamps, now + 1, 2);
  const denied = reserveBudgetWindow(second.timestamps, now + 2, 2);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(denied.allowed, false);
  assert.deepEqual(denied.timestamps, second.timestamps);
  assert.ok(denied.retryAfterSeconds > 0);
});

test("a call becomes available after the rolling 31-day window", () => {
  const now = 1_000_000;
  const prior = [now, now + 1];
  const result = reserveBudgetWindow(prior, now + AIRLABS_BUDGET_WINDOW_MS, 2);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.timestamps, [now + 1, now + AIRLABS_BUDGET_WINDOW_MS]);
});
