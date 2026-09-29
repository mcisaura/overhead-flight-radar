import { reserveBudgetWindow } from "./airlabs-budget-window";

export class AirLabsBudgetExceeded extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("AirLabs monthly budget exhausted");
  }
}

let localRequests: number[] = [];

export async function reserveAirLabsCall() {
  let bindings: Cloudflare.Env;
  try {
    const { env } = await import("cloudflare:workers");
    bindings = env as Cloudflare.Env;
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    const reservation = reserveBudgetWindow(localRequests, Date.now());
    localRequests = reservation.timestamps;
    if (!reservation.allowed) throw new AirLabsBudgetExceeded(reservation.retryAfterSeconds);
    return;
  }
  if (!bindings.AIRLABS_BUDGET) throw new Error("AirLabs budget binding is missing");
  const budget = bindings.AIRLABS_BUDGET.get(bindings.AIRLABS_BUDGET.idFromName("account"));
  const response = await budget.fetch("https://airlabs-budget.internal/reserve", { method: "POST" });
  if (response.status === 429) {
    const result = await response.json() as { retryAfterSeconds: number };
    throw new AirLabsBudgetExceeded(result.retryAfterSeconds);
  }
  if (!response.ok) throw new Error("AirLabs budget check unavailable");
}
