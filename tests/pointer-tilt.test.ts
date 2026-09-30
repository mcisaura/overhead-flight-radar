import assert from "node:assert/strict";
import { test } from "node:test";
import { createPointerTilt, targetPointerTilt, stepPointerTilt, pointerTiltMoving } from "../lib/pointer-tilt";

const bounds = { left: 100, top: 50, width: 800, height: 400 };

test("pointer tilt stays subtle across the hero and resets outside it", () => {
  const tilt = createPointerTilt();
  targetPointerTilt(tilt, 900, 450, bounds);
  assert.equal(tilt.targetPitch, 5 * Math.PI / 180);
  assert.equal(tilt.targetYaw, 7 * Math.PI / 180);
  targetPointerTilt(tilt, 500, 250, bounds);
  assert.equal(tilt.targetPitch, 0);
  assert.equal(tilt.targetYaw, 0);
  targetPointerTilt(tilt, 100, 50, bounds);
  assert.ok(tilt.targetPitch < 0 && tilt.targetYaw < 0);
  targetPointerTilt(tilt, 901, 250, bounds);
  assert.equal(tilt.targetPitch, 0);
  assert.equal(tilt.targetYaw, 0);
});

test("pointer easing is independent of frame rate and never overshoots", () => {
  const fast = createPointerTilt();
  const slow = createPointerTilt();
  for (const tilt of [fast, slow]) targetPointerTilt(tilt, 900, 450, bounds);
  for (let i = 0; i < 10; i++) stepPointerTilt(fast, 16, true);
  stepPointerTilt(slow, 160, true);
  assert.ok(Math.abs(fast.yaw - slow.yaw) < 1e-12);
  assert.ok(fast.yaw > 0 && fast.yaw < fast.targetYaw);
  assert.equal(pointerTiltMoving(fast, true), true);
});

test("manual interaction can settle to neutral; reduced motion can reset immediately", () => {
  const tilt = createPointerTilt();
  targetPointerTilt(tilt, 900, 450, bounds);
  stepPointerTilt(tilt, 160, true);
  const previous = tilt.yaw;
  stepPointerTilt(tilt, 160, false);
  assert.ok(tilt.yaw < previous);
  stepPointerTilt(tilt, Infinity, false);
  assert.equal(tilt.pitch, 0);
  assert.equal(tilt.yaw, 0);
  assert.equal(pointerTiltMoving(tilt, false), false);
});
