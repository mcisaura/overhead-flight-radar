import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FlightLink from "../components/boarding-pass/flight-link";
import { flightTrackingLink } from "../lib/flight-tracking";

test("tracking uses the reported callsign ahead of an aircraft's registration", () => {
  assert.deepEqual(flightTrackingLink({ callsign: " ual2147 ", registration: "N17264" }), {
    identifier: "UAL2147", url: "https://www.flightaware.com/live/flight/UAL2147",
  });
  assert.equal(flightTrackingLink({ callsign: "EJA206" })?.identifier, "EJA206");
});

test("missing or invalid callsigns fall back to a registration without guessing from aircraft types or hex addresses", () => {
  assert.equal(flightTrackingLink({ registration: " n17264 " })?.identifier, "N17264");
  assert.equal(flightTrackingLink({ callsign: "?", registration: "C-GABC" })?.identifier, "CGABC");
  for (const callsign of [null, "", "UNKNOWN", "2147", "UAL/2147", "UAL2147?foo=bar", "<script>"]) {
    assert.equal(flightTrackingLink({ callsign }), null);
  }
  assert.equal(flightTrackingLink({ registration: "UNKNOWN" }), null);
});

test("Live links open the provider in a separate tab; Demo and missing identities remain plain text", () => {
  const render = (props: { callsign?: string; demo?: boolean }) => renderToStaticMarkup(createElement(FlightLink, props, "United Airlines"));
  const live = render({ callsign: "UAL2147" });
  assert.match(live, /href="https:\/\/www.flightaware.com\/live\/flight\/UAL2147"/);
  assert.match(live, /target="_blank"/);
  assert.match(live, /rel="noopener noreferrer"/);
  assert.match(live, /opens in a new tab/);
  assert.equal(render({ callsign: "UAL2147", demo: true }), "United Airlines");
  assert.equal(render({}), "United Airlines");
});
