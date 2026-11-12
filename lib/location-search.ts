import { isSupportedMapLocation } from "./map-location";

export type SearchPlace = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string };
export type LocationSearchState = { status: "idle" | "waiting" | "loading" | "ready" | "empty" | "outside" | "error"; results: SearchPlace[] };

export function createLocationSearch(onState: (state: LocationSearchState) => void, { request = fetch, delayMs = 300 }: { request?: typeof fetch; delayMs?: number } = {}) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let task: Promise<void> | null = null;
  let term = "";
  let disposed = false;
  const publish = (status: LocationSearchState["status"], results: SearchPlace[] = []) => onState({ status, results });
  function cancel() {
    generation++;
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    task = null;
  }
  async function run(id: number, query: string) {
    if (disposed || id !== generation) return;
    const current = new AbortController();
    controller = current;
    publish("loading");
    try {
      const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
      const response = await request(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal: AbortSignal.any([current.signal, AbortSignal.timeout(8000)]) });
      if (!response.ok) throw new Error("Search unavailable");
      const body = await response.json() as { results?: SearchPlace[] };
      if (disposed || current.signal.aborted || id !== generation) return;
      const rows = Array.isArray(body.results) ? body.results : [];
      const places = rows.filter((item) => typeof item.name === "string" && isSupportedMapLocation(item.latitude, item.longitude));
      publish(places.length ? "ready" : rows.length ? "outside" : "empty", places);
    } catch {
      if (!disposed && !current.signal.aborted && id === generation) publish("error");
    } finally {
      if (id === generation) { controller = null; task = null; }
    }
  }
  function start() {
    clearTimeout(timer);
    if (disposed || term.length < 2) return Promise.resolve();
    const id = generation;
    const query = term;
    task = Promise.resolve().then(() => run(id, query));
    return task;
  }
  return {
    update(value: string) {
      if (disposed) return;
      cancel();
      term = value.trim().slice(0, 120);
      if (term.length < 2) { publish("idle"); return; }
      publish("waiting");
      timer = setTimeout(start, delayMs);
    },
    flush() { return task ?? start(); },
    reset() { cancel(); term = ""; if (!disposed) publish("idle"); },
    dispose() { cancel(); disposed = true; },
  };
}
