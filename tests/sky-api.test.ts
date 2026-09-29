import assert from "node:assert/strict";
import { after, test } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/sky/route";

const originalFetch = globalThis.fetch;
const originalKey = process.env.AIRLABS_API_KEY;
process.env.AIRLABS_API_KEY = "test-key";
after(() => { globalThis.fetch = originalFetch; process.env.AIRLABS_API_KEY = originalKey; });
type SkyBody = {
  flight: { hex: string; distanceKm: number; zoneProgress: object | null; estimatedPosition: { lon: number }; reportedPosition: { lon: number }; routeStatus: string; origin: object | null; destination: object | null };
  aircraft: { distanceKm: number; lat: number; lon: number; reportedPosition: { lat: number; lon: number }; originCode: string | null; routeStatus: string }[];
};

function request(lat: number, lon: number, client = "test-client") {
  return new NextRequest(`http://localhost/api/sky?mode=live&lat=${lat}&lon=${lon}`, { headers: { "cf-connecting-ip": client } });
}

function fixtureFetch(flight: Record<string, unknown>, airportFailure = false) {
  const calls: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) return Response.json({ response: [flight] });
    if (url.pathname.endsWith("/airports")) {
      if (airportFailure) return new Response("", { status: 429 });
      const code = url.searchParams.get("iata_code");
      return Response.json({ response: [{ iata_code: code, city: code, lat: code === "HOU" ? 29.65 : 29.98, lng: -95.3 }] });
    }
    return Response.json({ response: [] });
  };
  return calls;
}

test("invalid coordinates do not call upstream", async () => {
  globalThis.fetch = async () => { throw new Error("unexpected upstream request"); };
  const response = await GET(new NextRequest("http://localhost/api/sky?mode=live&lat=91&lon=0"));
  assert.equal(response.status, 400);
});

test("reported aircraft outside the zone can move inside; spatial fields agree", async () => {
  const now = Math.floor(Date.now() / 1000);
  const calls = fixtureFetch({ hex: "test-move", lat: 0, lng: -0.12, dir: 90, speed: 1111.2, updated: now - 30, status: "active", alt: 1000 });
  const response = await GET(request(0, 0, "movement"));
  assert.equal(response.status, 200);
  const body = await response.json() as SkyBody;
  assert.equal(body.flight.hex, "test-move");
  assert.equal(body.aircraft.length, 1);
  assert.ok(Number(calls.find((url) => url.pathname.endsWith("/flights"))!.searchParams.get("bbox")!.split(",")[1]) < -0.12);
  assert.ok(body.flight.estimatedPosition.lon > body.flight.reportedPosition.lon);
  assert.ok(Math.abs(body.flight.distanceKm - body.aircraft[0].distanceKm) < 0.001);
  assert.ok(body.flight.zoneProgress);
  assert.ok(Math.abs(body.aircraft[0].lon - body.flight.estimatedPosition.lon) < 0.001);
  assert.ok(Math.abs(body.aircraft[0].reportedPosition.lon - body.flight.reportedPosition.lon) < 0.001);
});

test("airport lookup failure leaves a route unverified and hides its endpoints", async () => {
  fixtureFetch({ hex: "test-route", lat: 29.76, lng: -95.37, dir: 0, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: "ACK", arr_iata: "BOS" }, true);
  const response = await GET(request(29.76, -95.37, "route"));
  const body = await response.json() as SkyBody;
  assert.equal(body.flight.routeStatus, "unverified");
  assert.equal(body.flight.origin, null);
  assert.equal(body.flight.destination, null);
  assert.equal(body.aircraft[0].originCode, null);
});

test("a geographically inconsistent reported route is withheld", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) return Response.json({ response: [{ hex: "bad-route", lat: 29.77, lng: -95.38, dir: 0, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: "ACK", arr_iata: "BOS" }] });
    if (url.pathname.endsWith("/airports")) return Response.json({ response: [{ city: "Northeast", lat: 42, lng: -71 }] });
    return Response.json({ response: [] });
  };
  const body = await (await GET(request(29.77, -95.38, "implausible"))).json() as SkyBody;
  assert.equal(body.flight.routeStatus, "implausible");
  assert.equal(body.flight.origin, null);
  assert.equal(body.flight.destination, null);
});

test("a plausible route with both airport coordinates is verified", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) return Response.json({ response: [{ hex: "good-route", lat: 29.8, lng: -95.4, dir: 0, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: "H1", arr_iata: "H2" }] });
    if (url.pathname.endsWith("/airports")) {
      const origin = url.searchParams.get("iata_code") === "H1";
      return Response.json({ response: [{ city: origin ? "Origin" : "Destination", lat: origin ? 29.6 : 30, lng: -95.4 }] });
    }
    return Response.json({ response: [] });
  };
  const body = await (await GET(request(29.8, -95.4, "plausible"))).json() as SkyBody;
  assert.equal(body.flight.routeStatus, "verified");
  assert.ok(body.flight.origin);
  assert.ok(body.flight.destination);
});

test("airport timeouts leave the route unverified and identify the failure class", async () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (message) => { logs.push(String(message)); };
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
      if (url.pathname.endsWith("/flights")) return Response.json({ response: [{ hex: "timeout-route", lat: 30, lng: -96, dir: 0, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: "TMA", arr_iata: "TMB" }] });
      if (url.pathname.endsWith("/airports")) return new Promise<Response>((_, reject) => {
        const signal = init?.signal;
        const guard = setTimeout(() => reject(new Error("Mock fetch exceeded its timeout")), 3000);
        signal?.addEventListener("abort", () => { clearTimeout(guard); reject(signal.reason); }, { once: true });
      });
      return Response.json({ response: [] });
    };
    const body = await (await GET(request(30, -96, "timeout"))).json() as SkyBody;
    assert.equal(body.flight.routeStatus, "unverified");
    assert.ok(logs.some((line) => line.includes('"kind":"timeout"')));
  } finally {
    console.error = originalError;
  }
});

test("a route becomes verified when airport metadata recovers", async () => {
  let failing = true;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) return Response.json({ response: [{ hex: "recovery", lat: 46, lng: -76, dir: 0, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: "R1", arr_iata: "R2" }] });
    if (url.pathname.endsWith("/airports")) return failing
      ? new Response("", { status: 503 })
      : Response.json({ response: [{ city: "Recovered", lat: url.searchParams.get("iata_code") === "R1" ? 45.9 : 46.1, lng: -76 }] });
    return Response.json({ response: [] });
  };
  const first = await (await GET(request(46, -76, "recovery"))).json() as SkyBody;
  assert.equal(first.flight.routeStatus, "unverified");
  failing = false;
  const second = await (await GET(request(46, -76, "recovery"))).json() as SkyBody;
  assert.equal(second.flight.routeStatus, "verified");
});

test("search and crossing work on both sides of the date line", async () => {
  const calls = fixtureFetch({ hex: "date-line", lat: 0, lng: -179.99, dir: 90, speed: 0, updated: Math.floor(Date.now() / 1000), status: "active" });
  const response = await GET(request(0, 179.99, "date-line"));
  const body = await response.json() as SkyBody;
  assert.equal(body.flight.hex, "date-line");
  assert.ok(body.flight.zoneProgress);
  assert.equal(calls.filter((url) => url.pathname.endsWith("/flights")).length, 2);
});

test("metadata enrichment stays bounded with a crowded sky", async () => {
  const calls: URL[] = [];
  const now = Math.floor(Date.now() / 1000);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) return Response.json({ response: Array.from({ length: 20 }, (_, index) => ({
      hex: `crowd-${index}`, lat: 35, lng: -80 + index / 10000, dir: 0, speed: 0, updated: now, status: "active",
      dep_iata: `D${index}`, arr_iata: `A${index}`,
    })) });
    if (url.pathname.endsWith("/airports")) return Response.json({ response: [{ city: "Sample", lat: 35, lng: -80 }] });
    return Response.json({ response: [] });
  };
  const body = await (await GET(request(35, -80, "crowd"))).json() as SkyBody;
  assert.equal(body.aircraft.length, 20);
  assert.ok(calls.filter((url) => url.pathname.endsWith("/airports")).length <= 16);
  assert.equal(body.aircraft[19].routeStatus, "unverified");
});

test("simultaneous sky requests share a four-call metadata ceiling", async () => {
  let active = 0;
  let maximum = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    if (url.pathname.endsWith("/flights")) {
      const latitude = Number(url.searchParams.get("bbox")!.split(",")[0]) < 15 ? 10 : 20;
      const prefix = latitude === 10 ? "Q" : "R";
      return Response.json({ response: Array.from({ length: 8 }, (_, index) => ({
        hex: `${prefix}-${index}`, lat: latitude, lng: 0, dir: 0, speed: 0,
        updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: `${prefix}${index}`,
      })) });
    }
    if (url.pathname.endsWith("/airports")) {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return Response.json({ response: [{ city: "Sample", lat: 10, lng: 0 }] });
    }
    return Response.json({ response: [] });
  };
  await Promise.all([GET(request(10, 0, "parallel-one")), GET(request(20, 0, "parallel-two"))]);
  assert.ok(maximum <= 4, `observed ${maximum} concurrent metadata calls`);
  assert.equal(maximum, 4);
});

test("metadata overload falls back instead of growing an unbounded queue", async () => {
  const logs: string[] = [];
  const originalError = console.error;
  console.error = (message) => { logs.push(String(message)); };
  try {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
      if (url.pathname.endsWith("/flights")) {
        const latitude = Math.round(Number(url.searchParams.get("bbox")!.split(",")[0]) + 0.42);
        return Response.json({ response: [{ hex: `overload-${latitude}`, lat: latitude, lng: 0, dir: 0, speed: 0,
          updated: Math.floor(Date.now() / 1000), status: "active", dep_iata: `OV${latitude}` }] });
      }
      if (url.pathname.endsWith("/airports")) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return Response.json({ response: [{ city: "Sample", lat: 10, lng: 0 }] });
      }
      return Response.json({ response: [] });
    };
    const responses = await Promise.all(Array.from({ length: 40 }, (_, index) => GET(request(index + 1, 0, `overload-${index}`))));
    assert.ok(responses.every((response) => response.status === 200));
    assert.ok(logs.some((line) => line.includes('"kind":"capacity"')));
  } finally {
    console.error = originalError;
  }
});

test("a partial upstream outage returns weather with no stale aircraft", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.open-meteo.com") return Response.json({ current: { temperature_2m: 70 } });
    return new Response("", { status: 503 });
  };
  const response = await GET(request(41, -71, "outage"));
  const body = await response.json() as { aircraft: object[]; flight: object | null; weather: object | null; warnings: string[] };
  assert.equal(response.status, 200);
  assert.deepEqual(body.aircraft, []);
  assert.equal(body.flight, null);
  assert.ok(body.weather);
  assert.ok(body.warnings.some((warning) => warning.includes("aircraft")));
});

test("missing and old reports do not appear as live aircraft", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return url.hostname === "api.open-meteo.com"
      ? Response.json({ current: { temperature_2m: 70 } })
      : Response.json({ response: [
        { hex: "no-time", lat: 44, lng: -74, status: "active" },
        { hex: "old", lat: 44, lng: -74, updated: Math.floor(Date.now() / 1000) - 61, status: "active" },
      ] });
  };
  const body = await (await GET(request(44, -74, "stale-reports"))).json() as { flight: object | null; aircraft: object[] };
  assert.equal(body.flight, null);
  assert.deepEqual(body.aircraft, []);
});

test("weather failure still returns the available aircraft result", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    return url.hostname === "api.open-meteo.com"
      ? new Response("", { status: 503 })
      : Response.json({ response: [] });
  };
  const response = await GET(request(45, -75, "weather-failure"));
  const body = await response.json() as { weather: object | null; warnings: string[] };
  assert.equal(response.status, 200);
  assert.equal(body.weather, null);
  assert.ok(body.warnings.some((warning) => warning.includes("Weather")));
});

test("repeated area requests reuse the upstream cache", async () => {
  let flightCalls = 0;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/flights")) flightCalls++;
    return url.hostname === "api.open-meteo.com"
      ? Response.json({ current: { temperature_2m: 70 } })
      : Response.json({ response: [] });
  };
  await GET(request(43, -73, "cache-one"));
  await GET(request(43, -73, "cache-two"));
  assert.equal(flightCalls, 1);
});

test("excess live requests are rejected before upstream work", async () => {
  let calls = 0;
  globalThis.fetch = async (input) => { if (new URL(String(input)).pathname.endsWith("/flights")) calls++; return Response.json({ response: [] }); };
  let last: Response | null = null;
  for (let index = 0; index < 13; index++) last = await GET(request(40 + index / 100, -70, "rate-test"));
  assert.equal(last?.status, 429);
  assert.equal(last?.headers.get("Retry-After"), "60");
  assert.ok(calls <= 12);
});
