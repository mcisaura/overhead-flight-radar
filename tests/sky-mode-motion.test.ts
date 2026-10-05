import assert from "node:assert/strict";
import { test } from "node:test";
import { animateSkyModeChange } from "../lib/sky-mode-motion";

function pendingView(events: string[]) {
  let cancelled = 0;
  const segment = {
    matches: () => true,
    animate: () => {
      events.push("animate");
      return { finished: new Promise<void>(() => {}), cancel: () => { cancelled++; } };
    },
  };
  const root = { querySelector: () => null, querySelectorAll: () => [segment] } as unknown as HTMLElement;
  return { root, cancelled: () => cancelled };
}

test("mode changes commit immediately even when animation completion never arrives", () => {
  const events: string[] = [];
  const view = pendingView(events);
  const cleanup = animateSkyModeChange(view.root, () => events.push("commit"), false);
  assert.deepEqual(events, ["commit", "animate"]);
  cleanup();
  cleanup();
  assert.equal(view.cancelled(), 1);
});

test("rapid mode changes cancel previous motion without delaying the next commit", () => {
  const events: string[] = [];
  const first = pendingView(events);
  const second = pendingView(events);
  const cancelFirst = animateSkyModeChange(first.root, () => events.push("live"), false);
  cancelFirst();
  const cancelSecond = animateSkyModeChange(second.root, () => events.push("demo"), false);
  assert.deepEqual(events, ["live", "animate", "demo", "animate"]);
  assert.equal(first.cancelled(), 1);
  assert.equal(second.cancelled(), 0);
  cancelSecond();
});

test("reduced motion and missing roots commit without measuring or animating", () => {
  let commits = 0;
  const root = { querySelector: () => { throw new Error("must not measure"); } } as unknown as HTMLElement;
  animateSkyModeChange(root, () => commits++, true)();
  animateSkyModeChange(null, () => commits++, false)();
  assert.equal(commits, 2);
});
