import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLocationRequester, type LocationIssue } from "../lib/location-access";
import LocationFeedback from "../components/controls/location-feedback";

function setup(geolocation?: Pick<Geolocation, "getCurrentPosition">) {
  const events: (string | GeolocationPosition)[] = [];
  const requester = createLocationRequester(geolocation, {
    onStart: () => events.push("start"),
    onSuccess: (position) => events.push(position),
    onError: (issue) => events.push(issue),
    onFinish: () => events.push("finish"),
  });
  return { requester, events };
}

function fakeGeolocation() {
  const calls: { success: PositionCallback; error: PositionErrorCallback; options?: PositionOptions }[] = [];
  return {
    calls,
    getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback | null, options?: PositionOptions) {
      assert.ok(error);
      calls.push({ success, error, options });
    },
  };
}
const error = (code: number) => ({ code, message: "Provider-specific detail" }) as GeolocationPositionError;
const position = { coords: { latitude: 29.76, longitude: -95.36 } } as GeolocationPosition;

test("browser location errors produce distinct recoveries and never update the chosen location", () => {
  for (const [code, issue] of [[1, "blocked"], [2, "unavailable"], [3, "timeout"], [99, "unknown"]] as const) {
    const source = fakeGeolocation();
    const { requester, events } = setup(source);
    assert.equal(source.calls.length, 0, "creating the requester must not ask for permission");
    requester.request();
    source.calls[0].error(error(code));
    assert.deepEqual(events, ["start", issue, "finish"]);
    assert.equal(source.calls.length, 1, "failures must not automatically retry");
  }
});

test("an explicit retry can succeed after a timeout, using one-shot location with bounded wait", () => {
  const source = fakeGeolocation();
  const { requester, events } = setup(source);
  requester.request();
  assert.deepEqual(source.calls[0].options, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 });
  source.calls[0].error(error(3));
  requester.request();
  source.calls[1].success(position);
  assert.deepEqual(events, ["start", "timeout", "finish", "start", position, "finish"]);
});

test("duplicate clicks are ignored while locating; cancelled and obsolete callbacks cannot change the sky", () => {
  const source = fakeGeolocation();
  const { requester, events } = setup(source);
  requester.request();
  requester.request();
  assert.equal(source.calls.length, 1);
  requester.cancel();
  source.calls[0].success(position);
  source.calls[0].error(error(1));
  assert.deepEqual(events, ["start"]);
  requester.request();
  source.calls[0].success(position);
  source.calls[1].success(position);
  assert.deepEqual(events, ["start", "start", position, "finish"]);
});

test("unsupported browsers and synchronous security failures finish cleanly", () => {
  const unsupported = setup();
  unsupported.requester.request();
  assert.deepEqual(unsupported.events, ["start", "unsupported", "finish"]);
  const blocked = setup({ getCurrentPosition() { throw new DOMException("Restricted", "SecurityError"); } });
  blocked.requester.request();
  assert.deepEqual(blocked.events, ["start", "blocked", "finish"]);
});

test("blocked access offers collapsed settings help; recoverable errors offer retry without losing the current sky", () => {
  const render = (issue: LocationIssue) => renderToStaticMarkup(createElement(LocationFeedback, { issue, onRetry() {} }));
  const blocked = render("blocked");
  assert.match(blocked, /role="status"/);
  assert.match(blocked, /<details class="location-permission-help">/);
  assert.match(blocked, /How to allow location/);
  assert.match(blocked, /device settings/);
  assert.doesNotMatch(blocked, /Try again/);
  for (const issue of ["unavailable", "timeout", "unknown"] as const) {
    const feedback = render(issue);
    assert.match(feedback, /Try again<\/button>/);
    assert.match(feedback, /Your current sky stays selected/);
    assert.doesNotMatch(feedback, /<details/);
  }
  assert.doesNotMatch(render("unsupported"), /Try again/);
});
