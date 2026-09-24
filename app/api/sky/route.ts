import { NextRequest, NextResponse } from "next/server";
import { getDemoSky } from "../../demo-data";
import { ZONE_RADIUS_KM, zoneProgress } from "../../../lib/zone-progress";

export const runtime = "edge";

type RawAircraft = {
  hex?: string; flight?: string; r?: string; t?: string; lat?: number; lon?: number;
  alt_baro?: number | "ground"; gs?: number; track?: number; seen_pos?: number; seen?: number;
};
type Airport = { iata_code?: string | null; icao_code?: string | null; municipality?: string | null; name?: string | null; latitude?: number | null; longitude?: number | null };
type AircraftResponse = { ac?: RawAircraft[] };
type RouteResponse = { response?: { flightroute?: { origin?: Airport | null; destination?: Airport | null } } };
type WeatherResponse = { current?: { temperature_2m?: number; cloud_cover?: number; wind_speed_10m?: number; weather_code?: number; is_day?: number } };

const upstreamCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
function airport(value: Airport | null | undefined) {
  if (!value) return null;
  return { code: value.iata_code || value.icao_code || "···", city: value.municipality || value.name || "Unknown" };
}
function plausibleRoute(position: { lat: number; lon: number; altitudeFt: number }, origin?: Airport | null, destination?: Airport | null) {
  if (origin?.latitude == null || origin.longitude == null || destination?.latitude == null || destination.longitude == null) return false;
  const toOrigin = haversine(position.lat, position.lon, origin.latitude, origin.longitude);
  const toDestination = haversine(position.lat, position.lon, destination.latitude, destination.longitude);
  // Near takeoff or landing, the listed route should touch an airport near the aircraft.
  if (position.altitudeFt < 12_000) return Math.min(toOrigin, toDestination) < 120;
  // At cruise, allow a generous detour from the shortest path, but reject clearly unrelated routes.
  const routeLength = haversine(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
  return toOrigin + toDestination - routeLength < 350;
}
async function getJson<T>(url: string, seconds: number, timeout = 9000, cacheNotFound = false): Promise<T> {
  const cached = upstreamCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value as Promise<T>;

  const value = fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json" } })
    .then((response) => {
      if (cacheNotFound && response.status === 404) return null as T;
      if (!response.ok) throw new Error(`Upstream ${response.status}`);
      return response.json() as Promise<T>;
    })
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

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("mode") !== "live") {
    return NextResponse.json(getDemoSky(request.nextUrl.searchParams.get("preset")), { headers: { "Cache-Control": "no-store" } });
  }
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || request.nextUrl.searchParams.get("lat") === null || request.nextUrl.searchParams.get("lon") === null) {
    return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
  }

  const warnings: string[] = [];
  const nearbyUrl = `https://opendata.adsb.fi/api/v3/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/20`;
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", lat.toFixed(4));
  weatherUrl.searchParams.set("longitude", lon.toFixed(4));
  weatherUrl.searchParams.set("current", "temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  const [aircraftResult, weatherResult] = await Promise.allSettled([getJson<AircraftResponse>(nearbyUrl, 30), getJson<WeatherResponse>(weatherUrl.toString(), 600)]);

  let flight = null;
  let nearbyCount = 0;
  let aircraft: { hex: string; callsign: string | null; registration: string | null; aircraftType: string | null; lat: number; lon: number; heading: number | null; altitudeFt: number; speedKts: number | null; distanceKm: number; seenSeconds: number }[] = [];
  if (aircraftResult.status === "fulfilled") {
    const raw: RawAircraft[] = Array.isArray(aircraftResult.value?.ac) ? aircraftResult.value.ac : [];
    const candidates = raw.filter((item) => typeof item.lat === "number" && typeof item.lon === "number" && item.alt_baro !== "ground" && (item.seen_pos ?? item.seen ?? 999) <= 60)
      .map((item) => {
        const distanceKm = haversine(lat, lon, item.lat!, item.lon!);
        const altitudeFt = typeof item.alt_baro === "number" ? item.alt_baro : null;
        const elevationDeg = altitudeFt == null ? 0 : Math.atan2(altitudeFt * 0.0003048, Math.max(distanceKm, 0.1)) * 180 / Math.PI;
        return { item, distanceKm, altitudeFt, elevationDeg };
      })
      .filter((entry) => entry.distanceKm <= ZONE_RADIUS_KM && entry.altitudeFt !== null && entry.altitudeFt > 500)
      .sort((a, b) => a.distanceKm - b.distanceKm || b.elevationDeg - a.elevationDeg);
    nearbyCount = candidates.length;
    aircraft = candidates.map(({ item, distanceKm, altitudeFt }) => ({
      hex: item.hex || "unknown", callsign: item.flight?.trim() || null,
      registration: item.r || null, aircraftType: item.t || null,
      lat: item.lat!, lon: item.lon!, heading: typeof item.track === "number" && Number.isFinite(item.track) ? item.track : null,
      altitudeFt: altitudeFt!, speedKts: typeof item.gs === "number" ? item.gs : null,
      distanceKm, seenSeconds: item.seen_pos ?? item.seen ?? 0,
    }));
    const selectedHex = request.nextUrl.searchParams.get("selected")?.toLowerCase();
    const selected = candidates.find(({ item }) => item.hex?.toLowerCase() === selectedHex) ?? candidates[0];
    if (selected) {
      const item = selected.item;
      const callsign = item.flight?.trim() || null;
      let origin = null, destination = null;
      let routeSource: "adsbdb" | null = null;
      let routeStatus: "available" | "missing" | "unverified" | "lookup-error" | "no-callsign" = callsign ? "missing" : "no-callsign";
      if (callsign) {
        try {
          const route = await getJson<RouteResponse | null>(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, 3600, 7000, true);
          const listed = route?.response?.flightroute;
          if (plausibleRoute({ lat: item.lat!, lon: item.lon!, altitudeFt: selected.altitudeFt! }, listed?.origin, listed?.destination)) {
            origin = airport(listed?.origin);
            destination = airport(listed?.destination);
            routeStatus = "available";
            routeSource = "adsbdb";
          } else if (listed?.origin && listed?.destination) {
            routeStatus = "unverified";
          }
        } catch (error) {
          routeStatus = "lookup-error";
        }
      }
      flight = { hex: item.hex || "unknown", callsign, registration: item.r || null, aircraftType: item.t || null,
        altitudeFt: selected.altitudeFt, speedKts: typeof item.gs === "number" ? item.gs : null,
        distanceKm: selected.distanceKm, elevationDeg: selected.elevationDeg,
        seenSeconds: item.seen_pos ?? item.seen ?? 0, origin, destination, routeStatus, routeSource,
        zoneProgress: zoneProgress({ lat, lon }, { lat: item.lat!, lon: item.lon!, heading: typeof item.track === "number" ? item.track : null }) };
    }
  } else { console.error("Aircraft lookup failed", aircraftResult.reason); warnings.push("Live aircraft positions are temporarily unavailable."); }

  let weather = null;
  if (weatherResult.status === "fulfilled") {
    const current = weatherResult.value?.current;
    if (current && typeof current.temperature_2m === "number") weather = {
      temperatureF: current.temperature_2m, cloudCover: current.cloud_cover ?? 0,
      windMph: current.wind_speed_10m ?? 0, code: current.weather_code ?? 0, isDay: Boolean(current.is_day),
    };
  } else { console.error("Weather lookup failed", weatherResult.reason); warnings.push("Weather is temporarily unavailable."); }

  if (aircraftResult.status === "rejected" && weatherResult.status === "rejected") return NextResponse.json({ error: "Sky data is temporarily unavailable." }, { status: 503 });
  return NextResponse.json({ flight, aircraft, nearbyCount, weather, updatedAt: new Date().toISOString(), warnings }, { headers: { "Cache-Control": "no-store" } });
}
