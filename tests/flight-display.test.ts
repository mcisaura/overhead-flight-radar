import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDistanceNm } from "../lib/flight-display";

test("distances display in nautical miles to one decimal place", () => {
  assert.equal(formatDistanceNm(9.26), "5.0 nm");
  assert.equal(formatDistanceNm(3.7), "2.0 nm");
  assert.equal(formatDistanceNm(0), "0.0 nm");
});
