import assert from "node:assert/strict";
import { test } from "node:test";
import { closestLiveAircraft, liveRefreshTarget, projectLiveAircraft } from "../lib/live-snapshot";

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

test("closest-aircraft selection preserves the distance and identifier tie break", () => {
  const aircraft = [
    { hex: "z", distanceKm: 2, seenSeconds: 10 },
    { hex: "a", distanceKm: 2, seenSeconds: 10 },
    { hex: "old", distanceKm: 0, seenSeconds: 61 },
  ];
  assert.equal(closestLiveAircraft(aircraft)?.hex, "a");
  assert.equal(closestLiveAircraft(aircraft, "a")?.hex, "z");
});

test("returning from a hidden tab hands off an expired report to a fresh aircraft", () => {
  const center = { lat: 0, lon: 0 };
  const receivedAt = 2_000_000;
  const reports = [
    { ...plane, hex: "first", lat: 0, lon: .001, reportedPosition: { lat: 0, lon: .001 }, heading: null, seenSeconds: 59 },
    { ...plane, hex: "second", lat: 0, lon: .01, reportedPosition: { lat: 0, lon: .01 }, heading: null, seenSeconds: 0 },
  ];
  const before = projectLiveAircraft(reports, center, receivedAt, receivedAt);
  assert.equal(liveRefreshTarget("first", before[0], closestLiveAircraft(before)), null);

  const after = projectLiveAircraft(reports, center, receivedAt, receivedAt + 32_000);
  assert.deepEqual(after.map((aircraft) => aircraft.hex), ["second"]);
  assert.deepEqual(liveRefreshTarget("first", after.find((aircraft) => aircraft.hex === "first"), closestLiveAircraft(after)), {
    kind: "handoff", hex: "second",
  });

  // Once the server selects the replacement, no additional handoff is needed.
  assert.equal(liveRefreshTarget("second", after[0], closestLiveAircraft(after)), null);
});

test("an exit with a replacement requests one handoff; expiry without a replacement waits for manual refresh", () => {
  assert.deepEqual(liveRefreshTarget("first", { distanceKm: 10 }, { hex: "second" }), { kind: "handoff", hex: "second" });
  assert.deepEqual(liveRefreshTarget("first", { distanceKm: 10 }, null), { kind: "exit", hex: "first" });
  assert.equal(liveRefreshTarget("first", undefined, null), null);
  assert.equal(liveRefreshTarget(undefined, undefined, null), null);
});
