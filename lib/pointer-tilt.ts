export type PointerTilt = { pitch: number; yaw: number; targetPitch: number; targetYaw: number };
export const createPointerTilt = (): PointerTilt => ({ pitch: 0, yaw: 0, targetPitch: 0, targetYaw: 0 });

export function targetPointerTilt(tilt: PointerTilt, x: number, y: number, bounds: { left: number; top: number; width: number; height: number }) {
  if (bounds.width <= 0 || bounds.height <= 0 || x < bounds.left || x > bounds.left + bounds.width || y < bounds.top || y > bounds.top + bounds.height) {
    tilt.targetPitch = tilt.targetYaw = 0;
    return;
  }
  tilt.targetPitch = ((y - bounds.top) / bounds.height * 2 - 1) * (5 * Math.PI / 180);
  tilt.targetYaw = ((x - bounds.left) / bounds.width * 2 - 1) * (7 * Math.PI / 180);
}

export function stepPointerTilt(tilt: PointerTilt, elapsedMs: number, enabled: boolean) {
  const pitch = enabled ? tilt.targetPitch : 0;
  const yaw = enabled ? tilt.targetYaw : 0;
  const settle = 1 - Math.exp(-Math.max(0, elapsedMs) / 160);
  tilt.pitch += (pitch - tilt.pitch) * settle;
  tilt.yaw += (yaw - tilt.yaw) * settle;
  if (Math.abs(pitch - tilt.pitch) < .0001) tilt.pitch = pitch;
  if (Math.abs(yaw - tilt.yaw) < .0001) tilt.yaw = yaw;
}

export function pointerTiltMoving(tilt: PointerTilt, enabled: boolean) {
  return Math.abs(tilt.pitch - (enabled ? tilt.targetPitch : 0)) > .0001
    || Math.abs(tilt.yaw - (enabled ? tilt.targetYaw : 0)) > .0001;
}
