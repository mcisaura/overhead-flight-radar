import assert from "node:assert/strict";
import { test } from "node:test";
import { mapAircraftForDisplay } from "../lib/map-position";
import { estimatePosition } from "../lib/flight-estimate";

test("date-line markers, airports, and route bounds share the observation location's world copy", () => {
  for (const direction of [1, -1]) {
    const center = direction * 179.99;
    const report = {
      lat: 0, lon: direction * -179.99,
      origin: { code: "ORG", lat: 0, lon: direction * 179.9 },
      destination: { code: "DST", lat: 0, lon: direction * -179.9 },
    };
    const original = structuredClone(report);
    const [display] = mapAircraftForDisplay([report], center);
    const longitudes = [center, display.lon, display.origin.lon, display.destination.lon];
    assert.ok(Math.max(...longitudes) - Math.min(...longitudes) < .21, "Full route stays near the date line");
    assert.ok(Math.abs(display.lon - center) < .021, "Aircraft stays in the local map");
    assert.equal(display.origin.code, "ORG");
    assert.deepEqual(report, original, "Reported coordinates must remain untouched");
  }
});

test("an aircraft crossing the date line moves continuously on the map", () => {
  for (const direction of [1, -1]) {
    const report = { lat: 0, lon: direction * 179.999, heading: direction > 0 ? 90 : 270, speedKts: 600, seenSeconds: 0 };
    const positions = [0, 1, 2].map((elapsed) => {
      const projected = estimatePosition(report, elapsed);
      return mapAircraftForDisplay([projected], direction * 179.99)[0];
    });
    for (let index = 1; index < positions.length; index++) {
      const delta = positions[index].lon - positions[index - 1].lon;
      assert.ok(delta * direction > 0 && Math.abs(delta) < .003, "Marker and attached lines must not jump to another world copy");
    }
  }
});

test("ordinary routes and missing airport coordinates keep their original values", () => {
  const aircraft = [
    { lat: 29.76, lon: -95.37, origin: { code: "IAH", lon: -95.34 }, destination: { code: "LAX", lon: -118.41 } },
    { lat: 29.77, lon: -95.35, origin: null, destination: { code: "UNK", lon: null } },
  ];
  assert.deepEqual(mapAircraftForDisplay(aircraft, -95.37), aircraft);
});
