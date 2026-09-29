import { DurableObject } from "cloudflare:workers";
import handler from "vinext/server/fetch-handler";
import { reserveBudgetWindow } from "./lib/airlabs-budget-window";

export class AirLabsBudget extends DurableObject {
  async fetch(request: Request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/reserve") return new Response(null, { status: 404 });
    const now = Date.now();
    const reservation = await this.ctx.storage.transaction(async (txn) => {
      const previous = await txn.get<number[]>("requests") ?? [];
      const result = reserveBudgetWindow(previous, now);
      if (result.allowed) await txn.put("requests", result.timestamps);
      return result;
    });
    return Response.json({ retryAfterSeconds: reservation.retryAfterSeconds }, { status: reservation.allowed ? 200 : 429 });
  }
}

export default handler;
