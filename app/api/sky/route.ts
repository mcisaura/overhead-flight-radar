import { NextRequest, NextResponse } from "next/server";
import { getDemoSky } from "../../demo-data";
import { ZONE_RADIUS_KM, zoneProgress } from "../../../lib/zone-progress";

export const runtime = "edge";

type AirLabsFlight = {
  hex?: string; reg_number?: string | null; flight_icao?: string | null; flight_iata?: string | null;
  lat?: number | null; lng?: number | null; alt?: number | null; dir?: number | null;
  speed?: number | null; aircraft_icao?: string | null; dep_iata?: string | null;
  arr_iata?: string | null; updated?: number | null; status?: string | null;
};
type AirLabsAirport = { iata_code?: string | null; city?: string | null; name?: string | null };
type AirLabsResponse<T> = { response?: T; error?: { code?: string; message?: string } };
type WeatherResponse = { current?: { temperature_2m?: number; cloud_cover?: number; wind_speed_10m?: number; weather_code?: number; is_day?: number } };

const upstreamCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
const flightFields = "hex,reg_number,flight_icao,flight_iata,lat,lng,alt,dir,speed,aircraft_icao,dep_iata,arr_iata,updated,status";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function airLabsUrl(endpoint: string, apiKey: string, params: Record<string, string>) {
  const url = new URL(`https://airlabs.co/api/v9/${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function bounds(lat: number, lon: number) {
  const latDelta = ZONE_RADIUS_KM / 111.32;
  const lonDelta = Math.min(180, ZONE_RADIUS_KM / Math.max(0.001, 111.32 * Math.cos(lat * Math.PI / 180)));
  return [Math.max(-90, lat - latDelta), Math.max(-180, lon - lonDelta), Math.min(90, lat + latDelta), Math.min(180, lon + lonDelta)]
    .map((coordinate) => coordinate.toFixed(4)).join(",");
}

async function getJson<T>(url: string, seconds: number, timeout = 9000): Promise<T> {
  const cached = upstreamCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.value as Promise<T>;

  const value = fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json" } })
    .then((response) => {
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

async function getAirLabs<T>(endpoint: string, apiKey: string, params: Record<string, string>, cacheSeconds: number) {
  const result = await getJson<AirLabsResponse<T>>(airLabsUrl(endpoint, apiKey, params), cacheSeconds);
  if (result.error) throw new Error(`AirLabs ${result.error.code || "error"}`);
  if (result.response == null) throw new Error("AirLabs response unavailable");
  return result.response;
}

async function getAirport(apiKey: string, code: string) {
  try {
    const airports = await getAirLabs<AirLabsAirport[]>("airports", apiKey, { iata_code: code, _fields: "iata_code,city,name" }, 86_400);
    return { code, city: airports[0]?.city || airports[0]?.name || code };
  } catch {
    return { code, city: code };
  }
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

  const warnings: string[] = [];
  const flights = getAirLabs<AirLabsFlight[]>("flights", apiKey, { bbox: bounds(lat, lon), _fields: flightFields }, 30);
  const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
  weatherUrl.searchParams.set("latitude", lat.toFixed(4));
  weatherUrl.searchParams.set("longitude", lon.toFixed(4));
  weatherUrl.searchParams.set("current", "temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day");
  weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
  weatherUrl.searchParams.set("wind_speed_unit", "mph");
  const [aircraftResult, weatherResult] = await Promise.allSettled([flights, getJson<WeatherResponse>(weatherUrl.toString(), 600)]);

  let flight = null;
  let nearbyCount = 0;
  let aircraft: { hex: string; callsign: string | null; registration: string | null; aircraftType: string | null; lat: number; lon: number; heading: number | null; altitudeFt: number | null; speedKts: number | null; distanceKm: number; seenSeconds: number }[] = [];
  if (aircraftResult.status === "fulfilled" && Array.isArray(aircraftResult.value)) {
    const candidates = aircraftResult.value
      .filter((item) => item.hex && typeof item.lat === "number" && typeof item.lng === "number" && (item.status === "en-route" || item.status === "active"))
      .map((item) => {
        const distanceKm = haversine(lat, lon, item.lat!, item.lng!);
        const altitudeFt = typeof item.alt === "number" ? item.alt * 3.28084 : null;
        const seenSeconds = typeof item.updated === "number" ? Math.max(0, Math.round(Date.now() / 1000 - item.updated)) : null;
        return { item, distanceKm, altitudeFt, seenSeconds };
      })
      .filter((entry) => entry.distanceKm <= ZONE_RADIUS_KM && (entry.altitudeFt === null || entry.altitudeFt > 500) && entry.seenSeconds !== null && entry.seenSeconds <= 60)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    nearbyCount = candidates.length;
    aircraft = candidates.map(({ item, distanceKm, altitudeFt, seenSeconds }) => ({
      hex: item.hex!, callsign: item.flight_icao || item.flight_iata || null,
      registration: item.reg_number || null, aircraftType: item.aircraft_icao || null,
      lat: item.lat!, lon: item.lng!, heading: typeof item.dir === "number" && Number.isFinite(item.dir) ? item.dir : null,
      altitudeFt, speedKts: typeof item.speed === "number" ? item.speed / 1.852 : null,
      distanceKm, seenSeconds: seenSeconds!,
    }));
    const selectedHex = request.nextUrl.searchParams.get("selected")?.toLowerCase();
    const selected = candidates.find(({ item }) => item.hex?.toLowerCase() === selectedHex) ?? candidates[0];
    if (selected) {
      const item = selected.item;
      const originCode = item.dep_iata?.trim() || null;
      const destinationCode = item.arr_iata?.trim() || null;
      const [origin, destination] = await Promise.all([
        originCode ? getAirport(apiKey, originCode) : Promise.resolve(null),
        destinationCode ? getAirport(apiKey, destinationCode) : Promise.resolve(null),
      ]);
      const altitudeKm = selected.altitudeFt === null ? null : selected.altitudeFt * 0.0003048;
      flight = {
        hex: item.hex!, callsign: item.flight_icao || item.flight_iata || null,
        registration: item.reg_number || null, aircraftType: item.aircraft_icao || null,
        altitudeFt: selected.altitudeFt, speedKts: typeof item.speed === "number" ? item.speed / 1.852 : null,
        distanceKm: selected.distanceKm,
        elevationDeg: altitudeKm === null ? null : Math.atan2(altitudeKm, Math.max(selected.distanceKm, 0.1)) * 180 / Math.PI,
        seenSeconds: selected.seenSeconds, origin, destination,
        routeStatus: origin && destination ? "available" : "missing", routeSource: "airlabs",
        zoneProgress: zoneProgress({ lat, lon }, { lat: item.lat!, lon: item.lng!, heading: typeof item.dir === "number" ? item.dir : null }),
      };
    }
  } else {
    console.error("AirLabs flight lookup failed");
    warnings.push("Live aircraft positions are temporarily unavailable.");
  }

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
