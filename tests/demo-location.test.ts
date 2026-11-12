import assert from "node:assert/strict";
import { test } from "node:test";
import { demoAircraftAtLocation, demoFlights } from "../lib/demo-data";
import { positionAtZoneProgress, zoneProgress } from "../lib/zone-progress";
import { distanceKm } from "../lib/flight-estimate";

test("all demo flights cross custom locations and radii at the selected progress", () => {
  for (const center of [{ lat: 51.5, lon: -.12 }, { lat: -33.8, lon: 151.2 }, { lat: 40, lon: 179.99 }]) {
    for (const radiusNm of [1, 5, 25]) {
      const radiusKm = radiusNm * 1.852;
      for (const sample of demoFlights) {
        const local = demoAircraftAtLocation(sample.aircraft, center, radiusKm);
        assert.ok(local);
        for (const percent of [0, 50, 100]) {
          const position = positionAtZoneProgress(center, local, percent, radiusKm);
          assert.ok(position);
          const crossing = zoneProgress(center, { ...local, ...position }, radiusKm);
          assert.ok(crossing);
          assert.ok(Math.abs(crossing.percent - percent) < .001);
          assert.ok(distanceKm(center, position) <= radiusKm * 1.01);
          assert.ok(position.lon >= -180 && position.lon <= 180);
        }
      }
    }
  }
});


test("unsupported polar centres do not create invalid Demo aircraft", () => {
  for (const lat of [-90, -89.9, -85.01, 85.01, 89.9, 90]) {
    for (const sample of demoFlights) {
      assert.equal(demoAircraftAtLocation(sample.aircraft, { lat, lon: 0 }, 25 * 1.852), null);
    }
  }
});


test("supported map boundaries keep Demo positions geographically valid", () => {
  for (const center of [{ lat: 85, lon: 179.99 }, { lat: -85, lon: -179.99 }]) {
    for (const sample of demoFlights) {
      const radiusKm = 25 * 1.852;
      const local = demoAircraftAtLocation(sample.aircraft, center, radiusKm);
      assert.ok(local);
      for (const percent of [0, 50, 100]) {
        const position = positionAtZoneProgress(center, local, percent, radiusKm);
        assert.ok(position);
        assert.ok(Number.isFinite(position.lat) && Math.abs(position.lat) <= 90);
        assert.ok(Number.isFinite(position.lon) && Math.abs(position.lon) <= 180);
        const crossing = zoneProgress(center, { ...local, ...position }, radiusKm);
        assert.ok(crossing);
        assert.ok(Math.abs(crossing.percent - percent) < .001);
      }
    }
  }
});
