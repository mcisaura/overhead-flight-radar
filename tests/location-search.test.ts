import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocationSearch, type LocationSearchState } from "../lib/location-search";

const place = (name: string) => ({ id: 1, name, latitude: 51.5, longitude: -.1, admin1: "England", country: "United Kingdom" });
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };

test("typing waits for the debounce and only searches the final query", async () => {
  const states: LocationSearchState[] = [];
  const urls: string[] = [];
  const found = deferred<void>();
  const search = createLocationSearch((state) => { states.push(state); if (state.status === "ready") found.resolve(); }, {
    delayMs: 5,
    request: async (input) => { urls.push(String(input)); return Response.json({ results: [place("London")] }); },
  });
  try {
    search.update("L");
    assert.equal(states.at(-1)?.status, "idle");
    search.update("Lo"); search.update("Lond"); search.update("London");
    assert.equal(urls.length, 0);
    assert.equal(states.at(-1)?.status, "waiting");
    await found.promise;
    assert.equal(urls.length, 1);
    assert.equal(new URL(urls[0]).searchParams.get("name"), "London");
  } finally { search.dispose(); }
});

test("an obsolete response cannot replace newer results even when fetch ignores abort", async () => {
  const states: LocationSearchState[] = [];
  const old = deferred<Response>();
  const search = createLocationSearch((state) => states.push(state), {
    request: async (input) => new URL(String(input)).searchParams.get("name") === "Paris" ? old.promise : Response.json({ results: [place("London")] }),
  });
  try {
    search.update("Paris"); const first = search.flush(); await Promise.resolve();
    search.update("London"); await search.flush();
    old.resolve(Response.json({ results: [place("Paris")] })); await first;
    assert.equal(states.at(-1)?.results[0].name, "London");
    search.update("Lo"); search.reset();
    assert.equal(states.at(-1)?.status, "idle");
  } finally { search.dispose(); }
});

test("clear, failure, empty and unsupported results keep search recoverable", async () => {
  const states: LocationSearchState[] = [];
  let count = 0;
  const search = createLocationSearch((state) => states.push(state), {
    request: async () => {
      count++;
      if (count === 1) throw new Error("Offline");
      if (count === 2) return Response.json({ results: [] });
      if (count === 3) return Response.json({ results: [{ ...place("Pole"), latitude: 90 }] });
      return Response.json({ results: [place("London")] });
    },
  });
  try {
    for (const status of ["error", "empty", "outside", "ready"]) {
      search.update("London"); await search.flush();
      assert.equal(states.at(-1)?.status, status);
    }
    search.update("Paris"); search.reset(); await search.flush();
    assert.equal(count, 4);
    assert.equal(states.at(-1)?.status, "idle");
  } finally { search.dispose(); }
});
