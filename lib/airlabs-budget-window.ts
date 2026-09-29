export const AIRLABS_BUDGET_LIMIT = 900;
export const AIRLABS_BUDGET_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

export function reserveBudgetWindow(previous: number[], now: number, limit = AIRLABS_BUDGET_LIMIT) {
  const recent = previous.filter((at) => at > now - AIRLABS_BUDGET_WINDOW_MS);
  if (recent.length >= limit) {
    return { allowed: false, timestamps: recent, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + AIRLABS_BUDGET_WINDOW_MS - now) / 1000)) };
  }
  return { allowed: true, timestamps: [...recent, now], retryAfterSeconds: 0 };
}
