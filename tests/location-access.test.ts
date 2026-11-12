import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLocationRequester, type LocationIssue } from "../lib/location-access";
import LocationFeedback, { usesIosSafariLocationHelp } from "../components/controls/location-feedback";

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

test("GPS positions outside the supported map area preserve the current sky and finish cleanly", () => {
  for (const [latitude, longitude] of [[85.01, 0], [-85.01, 0], [90, 0], [0, 181], [NaN, 0]]) {
    const source = fakeGeolocation();
    const { requester, events } = setup(source);
    requester.request();
    source.calls[0].success({ coords: { latitude, longitude } } as GeolocationPosition);
    assert.deepEqual(events, ["start", "out-of-range", "finish"]);
    requester.request();
    source.calls[1].success(position);
    assert.deepEqual(events, ["start", "out-of-range", "finish", "start", position, "finish"]);
  }
  for (const [latitude, longitude] of [[85, 180], [-85, -180], [0, 0]]) {
    const source = fakeGeolocation();
    const { requester, events } = setup(source);
    const edge = { coords: { latitude, longitude } } as GeolocationPosition;
    requester.request();
    source.calls[0].success(edge);
    assert.deepEqual(events, ["start", edge, "finish"]);
  }
});

test("out-of-range GPS feedback explains map selection without a misleading retry", () => {
  const html = renderToStaticMarkup(createElement(LocationFeedback, { issue: "out-of-range", onRetry() {} }));
  assert.match(html, /outside this map/);
  assert.match(html, /85° south and 85° north/);
  assert.match(html, /arrow beside Use my location/);
  assert.match(html, /Your current sky stays selected/);
  assert.doesNotMatch(html, /Try again/);
});

test("blocked access offers collapsed settings help; recoverable errors offer retry without losing the current sky", () => {
  const render = (issue: LocationIssue) => renderToStaticMarkup(createElement(LocationFeedback, { issue, onRetry() {} }));
  const blocked = render("blocked");
  assert.match(blocked, /role="status"/);
  assert.match(blocked, /<details class="location-permission-help">/);
  assert.match(blocked, /How to allow location/);
  assert.match(blocked, /device settings/);
  assert.match(blocked, /Check again<\/button>/);
  assert.match(blocked, /can’t be reopened by this site/);
  assert.doesNotMatch(blocked, /Try again/);
  for (const issue of ["unavailable", "timeout", "unknown"] as const) {
    const feedback = render(issue);
    assert.match(feedback, /Try again<\/button>/);
    assert.match(feedback, /Your current sky stays selected/);
    assert.doesNotMatch(feedback, /<details/);
  }
  assert.doesNotMatch(render("unsupported"), /Try again/);
});


test("Safari recovery is selected for iPhone and desktop-style iPad, not other browsers", () => {
  const mobileSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
  assert.equal(usesIosSafariLocationHelp({ userAgent: mobileSafari }), true);
  assert.equal(usesIosSafariLocationHelp({ userAgent: "Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(usesIosSafariLocationHelp({ userAgent: mobileSafari.replace("Version/18.0", "CriOS/130.0") }), false);
  assert.equal(usesIosSafariLocationHelp({ userAgent: "Mozilla/5.0 (Macintosh) Version/18.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 0 }), false);
  assert.equal(usesIosSafariLocationHelp(undefined), false);
});

test("blocked feedback offers a manual map fallback without requesting location", () => {
  let requested = false;
  let choseMap = false;
  const html = renderToStaticMarkup(createElement(LocationFeedback, {
    issue: "blocked", onRetry() { requested = true; }, onChooseLocation() { choseMap = true; },
  }));
  assert.match(html, /Choose on the map instead/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /Check again/);
  assert.equal(requested, false);
  assert.equal(choseMap, false);
});

test("Safari on iPhone gets expanded, device-specific permission recovery", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    platform: "iPhone", maxTouchPoints: 5,
  } });
  try {
    const html = renderToStaticMarkup(createElement(LocationFeedback, { issue: "blocked", onRetry() {} }));
    assert.match(html, /<details class="location-permission-help" open="">/);
    assert.match(html, /Allow location on iPhone or iPad/);
    assert.match(html, /Page Menu/);
    assert.match(html, /Website Settings/);
    assert.match(html, /Location Services/);
    assert.match(html, /Safari Websites/);
    assert.match(html, /While Using the App/);
    assert.match(html, /Check again/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "navigator", descriptor);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("an explicit retry after changing a denied permission can prompt and succeed", () => {
  const source = fakeGeolocation();
  const { requester, events } = setup(source);
  requester.request();
  source.calls[0].error(error(1));
  assert.deepEqual(events, ["start", "blocked", "finish"]);
  assert.equal(source.calls.length, 1);
  requester.request();
  assert.equal(source.calls.length, 2);
  source.calls[1].success(position);
  assert.deepEqual(events, ["start", "blocked", "finish", "start", position, "finish"]);
});
