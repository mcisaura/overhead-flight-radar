import { NextRequest, NextResponse } from "next/server";
import { getDemoSky } from "../../demo-data";
import { ZONE_RADIUS_KM, zoneProgress } from "../../../lib/zone-progress";
import { distanceKm, estimatePosition } from "../../../lib/flight-estimate";
import { airlineIdentity, displayAircraftType, displayFlightName } from "../../../lib/flight-display";
import { reportedRouteIsPlausible } from "../../../lib/route-plausibility";
import type { SkyAircraft, SkyFlight, SkyResponse } from "../../../lib/sky-contract";
import { AirLabsBudgetExceeded, reserveAirLabsCall } from "../../../lib/airlabs-quota";

export const runtime = "edge";

type AirLabsFlight = {
  hex?: string; reg_number?: string | null; flight_icao?: string | null; flight_iata?: string | null;
  lat?: number | null; lng?: number | null; alt?: number | null; dir?: number | null;
  speed?: number | null; aircraft_icao?: string | null; airline_icao?: string | null; airline_iata?: string | null; flight_number?: string | null; dep_iata?: string | null;
  arr_iata?: string | null; updated?: number | null; status?: string | null;
};
type AirLabsAirport = { iata_code?: string | null; city?: string | null; name?: string | null; lat?: number | null; lng?: number | null };
type AirLabsAirline = { name?: string | null; iata_code?: string | null; icao_code?: string | null };
type AirLabsFleet = { model?: string | null; icao?: string | null };
type AirLabsResponse<T> = { response?: T; error?: { code?: string; message?: string } };
type WeatherResponse = { current?: { temperature_2m?: number; cloud_cover?: number; wind_speed_10m?: number; weather_code?: number; is_day?: number } };

const upstreamCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
const flightFields = "hex,reg_number,flight_icao,flight_iata,flight_number,airline_icao,airline_iata,lat,lng,alt,dir,speed,aircraft_icao,dep_iata,arr_iata,updated,status";
const MAX_REPORT_AGE_SECONDS = 60;
const MAX_PLAUSIBLE_SPEED_KTS = 1200;
const MAX_ROUTE_LOOKUPS = 8;
const MAX_METADATA_CONCURRENCY = 4;
const MAX_METADATA_QUEUE = 32;
const RATE_WINDOW_MS = 60_000;
const PER_CLIENT_LIMIT = 12;
const GLOBAL_LIMIT = 120;
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const metadataWaiters: Array<() => void> = [];
let activeMetadata = 0;

function airLabsUrl(endpoint: string, apiKey: string, params: Record<string, string>) {
  const url = new URL(`https://airlabs.co/api/v9/${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function bounds(lat: number, lon: number) {
  const searchKm = ZONE_RADIUS_KM + MAX_PLAUSIBLE_SPEED_KTS * 1.852 * MAX_REPORT_AGE_SECONDS / 3600;
  const latDelta = searchKm / 111.32;
  const lonDelta = Math.min(180, searchKm / Math.max(0.001, 111.32 * Math.cos(lat * Math.PI / 180)));
  const south = Math.max(-90, lat - latDelta), north = Math.min(90, lat + latDelta);
  const boxes = lonDelta >= 180 ? [[-180, 180]]
    : lon - lonDelta < -180 ? [[-180, lon + lonDelta], [lon - lonDelta + 360, 180]]
    : lon + lonDelta > 180 ? [[lon - lonDelta, 180], [-180, lon + lonDelta - 360]]
    : [[lon - lonDelta, lon + lonDelta]];
  return boxes.map(([west, east]) => [south, west, north, east].map((value) => value.toFixed(4)).join(","));
}

function allowRequest(key: string) {
  const now = Date.now();
  for (const [name, entry] of requestCounts) if (entry.resetAt <= now) requestCounts.delete(name);
  for (const name of ["global", key]) {
    const entry = requestCounts.get(name);
    if (entry && entry.count >= (name === "global" ? GLOBAL_LIMIT : PER_CLIENT_LIMIT)) return false;
  }
  for (const name of ["global", key]) {
    const entry = requestCounts.get(name);
    requestCounts.set(name, entry ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + RATE_WINDOW_MS });
  }
  return true;
}

async function allowCloudflareRequest(client: string) {
  try {
    const { env } = await import("cloudflare:workers");
    const bindings = env as Cloudflare.Env;
    if (!bindings.SKY_CLIENT_LIMIT || !bindings.SKY_LOCATION_LIMIT) throw new Error("Sky rate limit bindings are missing");
    const perClient = await bindings.SKY_CLIENT_LIMIT.limit({ key: client });
    if (!perClient.success) return false;
    const perLocation = await bindings.SKY_LOCATION_LIMIT.limit({ key: "sky-live" });
    return perLocation.success;
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    return true;
  }
}

function logUpstream(endpoint: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.match(/\b(429|5\d\d|4\d\d)\b/)?.[1] ?? null;
  const kind = status === "429" || error instanceof AirLabsBudgetExceeded || /limit_exceeded/i.test(message) ? "quota" : message === "Metadata queue full" ? "capacity"
    : (error instanceof Error && error.name === "TimeoutError") || /timeout/i.test(message) ? "timeout" : "unavailable";
  console.error(JSON.stringify({ event: "upstream_failure", endpoint, status, kind }));
}

async function withMetadataSlot<T>(work: () => Promise<T>): Promise<T> {
  if (activeMetadata < MAX_METADATA_CONCURRENCY) activeMetadata++;
  else {
    if (metadataWaiters.length >= MAX_METADATA_QUEUE) throw new Error("Metadata queue full");
    await new Promise<void>((resolve) => metadataWaiters.push(resolve));
  }
  try {
    return await work();
  } finally {
    const next = metadataWaiters.shift();
    if (next) next();
    else activeMetadata--;
  }
}

async function getJson<T>(url: string, seconds: number, timeout = 9000, beforeFetch?: () => Promise<void>): Promise<T> {
  const cached = upstreamCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value as Promise<T>;

  const value = (async () => {
      await beforeFetch?.();
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Upstream ${response.status}`);
      return response.json() as Promise<T>;
    })()
    .catch((error) => {
      if (upstreamCache.get(url)?.value === value) upstreamCache.delete(url);
      throw error;
    });
  upstreamCache.set(url, { expiresAt: Date.now() + seconds * 1000, value });
  if (upstreamCache.size > 250) {
    for (const [key, entry] of upstreamCache) {
      if (entry.expiresAt <= Date.now()) upstreamCache.delete(key);
    }
    if (upstreamCache.size > 250) upstreamCache.delete(upstreamCache.keys().next().value!);
  }
  return value;
}

async function getAirLabs<T>(endpoint: string, apiKey: string, params: Record<string, string>, cacheSeconds: number) {
  const url = airLabsUrl(endpoint, apiKey, params);
  const result = endpoint === "flights"
    ? await getJson<AirLabsResponse<T>>(url, cacheSeconds, 9000, reserveAirLabsCall)
    : await withMetadataSlot(() => getJson<AirLabsResponse<T>>(url, cacheSeconds, 2500, reserveAirLabsCall));
  if (result.error || result.response == null) {
    // AirLabs can return an error in a successful HTTP response. Do not keep
    // that response in the one-day metadata cache.
    upstreamCache.delete(url);
    if (result.error?.code === "month_limit_exceeded") throw new AirLabsBudgetExceeded(3600);
    throw new Error(result.error ? `AirLabs ${result.error.code || "error"}` : "AirLabs response unavailable");
  }
  return result.response;
}

async function getAirport(apiKey: string, code: string) {
  try {
    const airports = await getAirLabs<AirLabsAirport[]>("airports", apiKey, { iata_code: code, _fields: "iata_code,city,name,lat,lng" }, 86_400);
    const airport = airports[0];
    return { code, city: airport?.city || airport?.name || code,
      lat: typeof airport?.lat === "number" && Number.isFinite(airport.lat) ? airport.lat : null,
      lon: typeof airport?.lng === "number" && Number.isFinite(airport.lng) ? airport.lng : null };
  } catch (error) {
    logUpstream("airports", error);
    return { code, city: code, lat: null, lon: null };
  }
}

async function getAirline(apiKey: string, icao: string | null, iata: string | null) {
  if (!icao && !iata) return null;
  try {
    // ICAO airline codes are unique; IATA codes are reused (Jet Linx and Japan Airlines both use JL).
    const params: Record<string, string> = icao ? { icao_code: icao } : { iata_code: iata! };
    const rows = await getAirLabs<AirLabsAirline[]>("airlines", apiKey, { ...params, _fields: "name,iata_code,icao_code" }, 86_400);
    const row = rows[0];
    return row ? airlineIdentity(row.icao_code || icao, row.iata_code || iata, row.name) : null;
  } catch (error) { logUpstream("airlines", error); return null; }
}

async function getAircraftModel(apiKey: string, hex: string) {
  try {
    const rows = await getAirLabs<AirLabsFleet[]>("fleets", apiKey, { hex, _fields: "model,icao" }, 86_400);
    return rows[0]?.model || null;
  } catch (error) { logUpstream("fleets", error); return null; }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("mode") !== "live") {
    return NextResponse.json(getDemoSky(request.nextUrl.searchParams.get("preset")), { headers: { "Cache-Control": "no-store" } });
  }
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || request.nextUrl.searchParams.get("lat") === null || request.nextUrl.searchParams.get("lon") === null) {
    return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  }
  const apiKey = process.env.AIRLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AirLabs is not configured." }, { status: 503 });
  const client = request.headers.get("cf-connecting-ip") || "anonymous";
  if (!allowRequest(`client:${client}`) || !await allowCloudflareRequest(client)) {
    console.warn(JSON.stringify({ event: "rate_limited", endpoint: "flights" }));
    return NextResponse.json({ error: "Too many live requests. Try again shortly." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  }

  const warnings: string[] = [];
  const flights = Promise.allSettled(bounds(lat, lon).map((bbox) => getAirLabs<AirLabsFlight[]>("flights", apiKey, { bbox, _fields: flightFields }, 30)))
    .then((results) => {
      const groups = results.filter((result): result is PromiseFulfilledResult<AirLabsFlight[]> => result.status === "fulfilled");
      if (!groups.length) {
        const failures = results as PromiseRejectedResult[];
        throw failures.find((result) => result.reason instanceof AirLabsBudgetExceeded)?.reason ?? failures[0].reason;
      }
      for (const result of results) if (result.status === "rejected") logUpstream("flights", result.reason);
      if (groups.length !== results.length) warnings.push("Live coverage may be incomplete.");
      return [...new Map(groups.flatMap((result) => result.value).filter((item) => item.hex).map((item) => [item.hex, item])).values()];
    });
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", lat.toFixed(4));
  weatherUrl.searchParams.set("longitude", lon.toFixed(4));
  weatherUrl.searchParams.set("current", "temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  const [aircraftResult, weatherResult] = await Promise.allSettled([flights, getJson<WeatherResponse>(weatherUrl.toString(), 600)]);
  const snapshotAt = Date.now();
  if (aircraftResult.status === "rejected" && aircraftResult.reason instanceof AirLabsBudgetExceeded) {
    console.warn(JSON.stringify({ event: "airlabs_budget_exhausted" }));
    return NextResponse.json({ error: "The monthly live-data allowance has been used. Please try again later." }, {
      status: 429, headers: { "Retry-After": String(aircraftResult.reason.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  let flight: SkyFlight | null = null;
  let nearbyCount = 0;
  let aircraft: SkyAircraft[] = [];
  if (aircraftResult.status === "fulfilled" && Array.isArray(aircraftResult.value)) {
    const candidates = aircraftResult.value
      .filter((item) => item.hex && typeof item.lat === "number" && Number.isFinite(item.lat) && typeof item.lng === "number" && Number.isFinite(item.lng) && (item.status === "en-route" || item.status === "active"))
      .map((item) => {
        const altitudeFt = typeof item.alt === "number" && Number.isFinite(item.alt) ? item.alt * 3.28084 : null;
        const seenSeconds = typeof item.updated === "number" ? Math.max(0, Math.round(snapshotAt / 1000 - item.updated)) : null;
        const heading = typeof item.dir === "number" && Number.isFinite(item.dir) ? item.dir : null;
        const speedKts = typeof item.speed === "number" && Number.isFinite(item.speed) && item.speed >= 0 ? item.speed / 1.852 : null;
        const projected = seenSeconds === null ? null : estimatePosition({ lat: item.lat!, lon: item.lng!, heading, speedKts, seenSeconds }, 0);
        const projectedDistanceKm = projected ? distanceKm({ lat, lon }, projected) : Infinity;
        return { item, altitudeFt, seenSeconds, speedKts, projected, projectedDistanceKm };
      })
      .filter((entry) => entry.projectedDistanceKm <= ZONE_RADIUS_KM && entry.seenSeconds !== null && entry.seenSeconds <= MAX_REPORT_AGE_SECONDS)
      .sort((a, b) => a.projectedDistanceKm - b.projectedDistanceKm || a.item.hex!.localeCompare(b.item.hex!));
    nearbyCount = candidates.length;
    const selected = candidates[0];
    const routeCandidates = candidates.slice(0, MAX_ROUTE_LOOKUPS);
    const airportCodes = [...new Set(routeCandidates.flatMap(({ item }) => [item.dep_iata?.trim(), item.arr_iata?.trim()]).filter((code): code is string => Boolean(code)))];
    const airportList = await Promise.all(airportCodes.map((code) => getAirport(apiKey, code)));
    const airportsByCode = new Map(airportList.map((airport) => [airport.code, airport]));
    aircraft = candidates.map(({ item, projected, projectedDistanceKm, altitudeFt, seenSeconds, speedKts }) => {
      const originCode = item.dep_iata?.trim() || null;
      const destinationCode = item.arr_iata?.trim() || null;
      const reportedOrigin = airportsByCode.get(originCode || "") ?? null;
      const reportedDestination = airportsByCode.get(destinationCode || "") ?? null;
      const routeVerified = reportedOrigin?.lat != null && reportedOrigin.lon != null && reportedDestination?.lat != null && reportedDestination.lon != null;
      const routePlausible = routeVerified && reportedRouteIsPlausible(projected!, reportedOrigin, reportedDestination);
      const routeStatus = !originCode || !destinationCode ? "missing" : !routeVerified ? "unverified" : routePlausible ? "verified" : "implausible";
      return {
        hex: item.hex!, callsign: item.flight_icao || item.flight_iata || null,
        registration: item.reg_number || null, aircraftType: item.aircraft_icao || null,
        airlineIcao: item.airline_icao || null, airlineIata: item.airline_iata || null, flightNumber: item.flight_number || null,
        originCode: routeStatus === "verified" ? originCode : null, destinationCode: routeStatus === "verified" ? destinationCode : null,
        origin: routeStatus === "verified" ? reportedOrigin : null,
        destination: routeStatus === "verified" ? reportedDestination : null,
        routeStatus,
        lat: projected!.lat, lon: projected!.lon, reportedPosition: { lat: item.lat!, lon: item.lng! },
        heading: typeof item.dir === "number" && Number.isFinite(item.dir) ? item.dir : null,
        altitudeFt, speedKts, distanceKm: projectedDistanceKm, seenSeconds: seenSeconds!,
      };
    });
    if (selected) {
      const item = selected.item;
      const airlineIcao = item.airline_icao || item.flight_icao?.match(/^([A-Z]{3})\d/)?.[1] || null;
      const [airlineLookup, aircraftModel] = await Promise.all([
        getAirline(apiKey, airlineIcao, item.airline_iata || null),
        getAircraftModel(apiKey, item.hex!),
      ]);
      const airline = airlineLookup ?? airlineIdentity(airlineIcao, item.airline_iata);
      const callsign = item.flight_icao || item.flight_iata || null;
      const displayName = displayFlightName(callsign, airline, item.flight_number);
      const displayType = displayAircraftType(item.aircraft_icao, aircraftModel);
      const selectedAircraft = aircraft.find((plane) => plane.hex === item.hex);
      const origin = selectedAircraft?.origin ?? null;
      const destination = selectedAircraft?.destination ?? null;
      const routeStatus = selectedAircraft?.routeStatus ?? "missing";
      if (selectedAircraft) Object.assign(selectedAircraft, { airline, displayName, displayType, aircraftModel });
      const altitudeKm = selected.altitudeFt === null ? null : selected.altitudeFt * 0.0003048;
      flight = {
        hex: item.hex!, callsign,
        registration: item.reg_number || null, aircraftType: item.aircraft_icao || null,
        airline, flightNumber: item.flight_number || null, flightIata: item.flight_iata || null, aircraftModel,
        altitudeFt: selected.altitudeFt, speedKts: selected.speedKts,
        distanceKm: selected.projectedDistanceKm,
        elevationDeg: altitudeKm === null ? null : Math.atan2(altitudeKm, Math.max(selected.projectedDistanceKm, 0.1)) * 180 / Math.PI,
        seenSeconds: selected.seenSeconds!, origin, destination,
        routeStatus, routeSource: "airlabs",
        reportedPosition: { lat: item.lat!, lon: item.lng! },
        estimatedPosition: { lat: selected.projected!.lat, lon: selected.projected!.lon },
        zoneProgress: zoneProgress({ lat, lon }, { ...selected.projected!, heading: typeof item.dir === "number" ? item.dir : null }),
      };
    }
  } else {
    logUpstream("flights", aircraftResult.status === "rejected" ? aircraftResult.reason : new Error("Invalid response"));
    warnings.push("Live aircraft positions are temporarily unavailable.");
  }

  let weather = null;
  if (weatherResult.status === "fulfilled") {
    const current = weatherResult.value?.current;
    if (current && typeof current.temperature_2m === "number") weather = {
      temperatureF: current.temperature_2m, cloudCover: current.cloud_cover ?? 0,
      windMph: current.wind_speed_10m ?? 0, code: current.weather_code ?? 0, isDay: Boolean(current.is_day),
    };
  } else { logUpstream("weather", weatherResult.reason); warnings.push("Weather is temporarily unavailable."); }

  if (aircraftResult.status === "rejected" && weatherResult.status === "rejected") return NextResponse.json({ error: "Sky data is temporarily unavailable." }, { status: 503 });
  const body: SkyResponse = { flight, aircraft, nearbyCount, weather, updatedAt: new Date(snapshotAt).toISOString(), snapshotAgeMs: Date.now() - snapshotAt, warnings };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
