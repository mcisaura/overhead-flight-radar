import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AircraftTypeLink from "../components/boarding-pass/aircraft-type-link";
import { aircraftSearchLink } from "../lib/aircraft-search";

test("aircraft searches use the full model when available, then known or unfamiliar type codes", () => {
  assert.equal(new URL(aircraftSearchLink("B738")!.url).searchParams.get("q"), "Boeing 737-800 aircraft");
  assert.equal(new URL(aircraftSearchLink("B738", "Boeing 737-800 (winglets)")!.url).searchParams.get("q"), "Boeing 737-800 (winglets) aircraft");
  assert.equal(new URL(aircraftSearchLink("ZZ99")!.url).searchParams.get("q"), "ZZ99 aircraft");
});

test("missing aircraft information has no link; special characters stay inside the query", () => {
  assert.equal(aircraftSearchLink(), null);
  assert.equal(aircraftSearchLink(null, "Aircraft type unknown"), null);
  const url = new URL(aircraftSearchLink(null, "Example & Sons / Model +1")!.url);
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.searchParams.get("q"), "Example & Sons / Model +1 aircraft");
  assert.equal(Array.from(url.searchParams.keys()).length, 1);
});

test("aircraft links preserve their label and open a separate tab with an accessible description", () => {
  const html = renderToStaticMarkup(createElement(AircraftTypeLink, { code: "B738" }, "B738"));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, />B738<span/);
  assert.match(html, /information and images/);
  assert.equal(renderToStaticMarkup(createElement(AircraftTypeLink, {}, "—")), "—");
});
