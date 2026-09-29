export function advanceDemoElapsed(elapsedMs: number, lastTickMs: number, nowMs: number, durationMs: number) {
  return Math.min(durationMs, elapsedMs + Math.max(0, nowMs - lastTickMs));
}
