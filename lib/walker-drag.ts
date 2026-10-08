export type WalkerPoint = { x: number; y: number };
export const WALKER_HANDLE_HEIGHT = 72;
const EDGE_INSET = 15;

export function walkerProgressAtX(x: number, track: { left: number; width: number }) {
  const width = track.width - EDGE_INSET * 2;
  if (width <= 0) return 0;
  return Math.max(0, Math.min(100, (x - track.left - EDGE_INSET) / width * 100));
}

export function walkerLandingPoint(progress: number, track: { left: number; bottom: number; width: number }): WalkerPoint {
  return {
    x: track.left + EDGE_INSET + Math.max(0, track.width - EDGE_INSET * 2) * Math.max(0, Math.min(100, progress)) / 100,
    y: track.bottom - WALKER_HANDLE_HEIGHT,
  };
}

export function walkerDropPosition(start: WalkerPoint, landing: WalkerPoint, elapsedMs: number) {
  const gravity = 2400; // Screen pixels per second squared.
  const distance = Math.max(0, landing.y - start.y);
  const duration = Math.max(160, Math.sqrt(2 * distance / gravity) * 1000);
  const elapsed = Math.max(0, elapsedMs);
  const t = Math.min(1, elapsed / duration);
  return {
    x: start.x + (landing.x - start.x) * (1 - (1 - t) ** 2),
    y: landing.y >= start.y
      ? Math.min(landing.y, start.y + .5 * gravity * (elapsed / 1000) ** 2)
      : start.y + (landing.y - start.y) * t,
    landed: t === 1,
  };
}
