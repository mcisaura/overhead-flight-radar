import assert from "node:assert/strict";
import { test } from "node:test";
import { clampMapLatitude, isSupportedMapLocation, MAX_MAP_LATITUDE, wrapMapLongitude } from "../lib/map-location";

test("map selections accept supported edges and reject polar or invalid coordinates", () => {
  for (const lat of [-MAX_MAP_LATITUDE, 0, MAX_MAP_LATITUDE]) {
    for (const lon of [-180, 0, 180]) assert.equal(isSupportedMapLocation(lat, lon), true);
  }
  for (const lat of [-90, -85.0001, 85.0001, 90, NaN, Infinity]) assert.equal(isSupportedMapLocation(lat, 0), false);
  for (const lon of [-181, 181, NaN, Infinity]) assert.equal(isSupportedMapLocation(0, lon), false);
});

test("map movement clamps latitude and wraps across either dateline", () => {
  assert.equal(clampMapLatitude(89.9), MAX_MAP_LATITUDE);
  assert.equal(clampMapLatitude(-89.9), -MAX_MAP_LATITUDE);
  assert.equal(clampMapLatitude(29.76), 29.76);
  assert.equal(wrapMapLongitude(180.25), -179.75);
  assert.equal(wrapMapLongitude(-180.25), 179.75);
  assert.equal(wrapMapLongitude(1080.25), .25);
  assert.equal(wrapMapLongitude(-1080.25), -.25);
});
