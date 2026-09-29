import assert from "node:assert/strict";
import { test } from "node:test";
import { closestLiveAircraft, projectLiveAircraft } from "../lib/live-snapshot";

const place = { lat: 29.76, lon: -95.37 };
const plane = { hex: "first", ...place, reportedPosition: place, heading: 90, speedKts: 200, seenSeconds: 20 };

test("a failed poll retains a recent aircraft, then expires it from the active sky", () => {
  const receivedAt = 1_000_000;
  assert.equal(projectLiveAircraft([plane], place, receivedAt, receivedAt + 30_000).length, 1);
  assert.equal(projectLiveAircraft([plane], place, receivedAt, receivedAt + 71_000).length, 0);
});

test("a successful poll restores the active aircraft after stale expiry", () => {
  const refreshedAt = 1_100_000;
  const result = projectLiveAircraft([{ ...plane, seenSeconds: 3 }], place, refreshedAt, refreshedAt + 1_000);
  assert.equal(result.length, 1);
  assert.equal(result[0].seenSeconds, 4);
});

test("the browser projects from the report instead of projecting the API estimate twice", () => {
  const receivedAt = 1_200_000;
  const projected = projectLiveAircraft([{ ...plane, lon: -95.34 }], place, receivedAt, receivedAt);
  assert.ok(projected[0].lon < -95.34);
  assert.ok(projected[0].lon > plane.lon);
});

test("a moving second aircraft can become the closest and take over", () => {
  const center = { lat: 0, lon: 0 };
  const receivedAt = 2_000_000;
  const first = { hex: "first", lat: 0, lon: 0.02, reportedPosition: { lat: 0, lon: 0.02 }, heading: null, speedKts: null, seenSeconds: 0 };
  const second = { hex: "second", lat: 0, lon: -0.08, reportedPosition: { lat: 0, lon: -0.08 }, heading: 90, speedKts: 600, seenSeconds: 0 };
  assert.equal(closestLiveAircraft(projectLiveAircraft([first, second], center, receivedAt, receivedAt))?.hex, "first");
  assert.equal(closestLiveAircraft(projectLiveAircraft([first, second], center, receivedAt, receivedAt + 25_000))?.hex, "second");
});
