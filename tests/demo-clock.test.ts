import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceDemoElapsed } from "../lib/demo-clock";

test("background timer throttling advances a crossing by real elapsed time", () => {
  assert.equal(advanceDemoElapsed(5_000, 1_000, 61_000, 30_000), 30_000);
});

test("a paused or scrubbed crossing resumes from its stored elapsed time", () => {
  assert.equal(advanceDemoElapsed(12_000, 80_000, 80_050, 30_000), 12_050);
});
