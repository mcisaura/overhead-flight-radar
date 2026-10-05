import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { walkerDropPosition, walkerLandingPoint, walkerProgressAtX } from "../lib/walker-drag";
import { demoFlights, demoElapsedFractionAtProgress, demoProgressAtElapsedFraction } from "../lib/demo-data";
import HeroProgressLine from "../components/sky/hero-progress-line";

const track = { left: 100, bottom: 600, width: 530 };

test("horizontal dragging reaches the whole timeline and clamps outside either end", () => {
  assert.equal(walkerProgressAtX(115, track), 0);
  assert.equal(walkerProgressAtX(365, track), 50);
  assert.equal(walkerProgressAtX(615, track), 100);
  assert.equal(walkerProgressAtX(-200, track), 0);
  assert.equal(walkerProgressAtX(1200, track), 100);
  assert.equal(walkerProgressAtX(200, { left: 100, width: 0 }), 0);
});

test("a purely vertical lift preserves the chosen progress, including after the midpoint", () => {
  for (const progress of [0, 25, 50, 75, 100]) {
    const landing = walkerLandingPoint(progress, track);
    assert.equal(walkerProgressAtX(landing.x, track), progress);
    const halfwayDown = walkerDropPosition({ x: landing.x, y: landing.y - 300 }, landing, 250);
    assert.equal(halfwayDown.x, landing.x);
  }
});

test("the dropped character accelerates downwards and lands exactly on the bar", () => {
  const landing = walkerLandingPoint(70, track);
  const start = { x: landing.x, y: landing.y - 300 };
  const first = walkerDropPosition(start, landing, 100);
  const second = walkerDropPosition(start, landing, 200);
  assert.ok(first.y > start.y && first.y < landing.y);
  assert.ok(second.y - first.y > first.y - start.y);
  assert.equal(second.landed, false);
  assert.deepEqual(walkerDropPosition(start, landing, 1000), { ...landing, landed: true });
  assert.deepEqual(walkerDropPosition(start, landing, 60_000), { ...landing, landed: true });
});

test("a drop outside the bar returns to its endpoint and a resized bar remains reachable", () => {
  const start = { x: 1000, y: 200 };
  const landing = walkerLandingPoint(100, track);
  const falling = walkerDropPosition(start, landing, 200);
  assert.ok(falling.x < start.x && falling.x > landing.x);
  const resized = walkerLandingPoint(100, { left: 23, bottom: 300, width: 300 });
  assert.deepEqual(walkerDropPosition(start, resized, 1000), { ...resized, landed: true });
  // If the page scrolls during release, the character can settle to a higher bar.
  assert.deepEqual(walkerDropPosition({ x: 200, y: 700 }, resized, 1000), { ...resized, landed: true });
});

test("scrubbed positions resume from the matching elapsed time for every Demo flight", () => {
  for (const flight of demoFlights) {
    for (const x of [115, 200, 365, 500, 615]) {
      const progress = walkerProgressAtX(x, track);
      const elapsed = demoElapsedFractionAtProgress(flight.profile, progress);
      assert.ok(Math.abs(demoProgressAtElapsedFraction(flight.profile, elapsed) - progress) < .00001);
    }
  }
});

test("the Demo character is a keyboard-accessible slider; Live remains a progress indicator", () => {
  const props = { progress: 75, label: "Test flight crossing", valueText: "75% through the zone", onScrubStart() {}, onProgressChange() {}, onScrubEnd() {} };
  const demo = renderToStaticMarkup(createElement(HeroProgressLine, props));
  assert.match(demo, /role="slider"/);
  assert.match(demo, /aria-valuenow="75"/);
  assert.doesNotMatch(demo, /role="progressbar"/);
  const live = renderToStaticMarkup(createElement(HeroProgressLine, { ...props, live: true }));
  assert.match(live, /role="progressbar"/);
  assert.doesNotMatch(live, /role="slider"/);
});
