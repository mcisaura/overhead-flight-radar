import { NextRequest, NextResponse } from "next/server";
import { getDemoSky } from "../../demo-data";

export const runtime = "edge";

type RawAircraft = {
  hex?: string; flight?: string; r?: string; t?: string; lat?: number; lon?: number;
  alt_baro?: number | "ground"; gs?: number; track?: number; seen_pos?: number; seen?: number;
};
type Airport = { iata_code?: string | null; icao_code?: string | null; municipality?: string | null; name?: string | null; latitude?: number | null; longitude?: number | null };
type AircraftResponse = { ac?: RawAircraft[] };
type RouteResponse = { response?: { flightroute?: { origin?: Airport | null; destination?: Airport | null } } };
type AirLabsResponse = { response?: {
  hex?: string | null; lat?: number | null; lng?: number | null; updated?: number | null; status?: string | null;
  dep_iata?: string | null; dep_icao?: string | null; dep_city?: string | null; dep_name?: string | null;
  arr_iata?: string | null; arr_icao?: string | null; arr_city?: string | null; arr_name?: string | null;
}; error?: { code?: string; message?: string } };
type WeatherResponse = { current?: { temperature_2m?: number; cloud_cover?: number; wind_speed_10m?: number; weather_code?: number; is_day?: number } };

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
async function getJson<T>(url: string, seconds: number, timeout = 9000): Promise<T> {
  const response = await fetch(url, { next: { revalidate: seconds }, signal: AbortSignal.timeout(timeout), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json() as Promise<T>;
}

async function currentAirLabsRoute(item: RawAircraft, callsign: string) {
  const key = process.env.AIRLABS_API_KEY;
  if (!key || !item.hex || item.lat == null || item.lon == null || !/^[A-Z]{2,3}\d[A-Z0-9]*$/i.test(callsign)) return null;
  const url = new URL("https://airlabs.co/api/v9/flight");
  url.searchParams.set("flight_icao", callsign);
  url.searchParams.set("api_key", key);
  const data = await getJson<AirLabsResponse>(url.toString(), 300, 7000);
  const match = data.response;
  if (!match || data.error || match.hex?.toLowerCase() !== item.hex.toLowerCase() ||
      typeof match.lat !== "number" || typeof match.lng !== "number" ||
      typeof match.updated !== "number" || match.status !== "en-route" ||
      Date.now() / 1000 - match.updated > 1200 || match.updated > Date.now() / 1000 + 60 ||
      haversine(item.lat, item.lon, match.lat, match.lng) > 150) return null;
  const departure = match.dep_iata || match.dep_icao;
  const arrival = match.arr_iata || match.arr_icao;
  if (!departure || !arrival) return null;
  return {
    origin: { code: departure, city: match.dep_city || match.dep_name || "Departure airport" },
    destination: { code: arrival, city: match.arr_city || match.arr_name || "Arrival airport" },
  };
}

export async function GET(request: NextRequest) {
  if (process.env.FLIGHT_DATA_MODE !== "live") {
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
  const [aircraftResult, weatherResult] = await Promise.allSettled([getJson<AircraftResponse>(nearbyUrl, 20), getJson<WeatherResponse>(weatherUrl.toString(), 600)]);

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
      .filter((entry) => entry.distanceKm <= 32.2 && entry.altitudeFt !== null && entry.altitudeFt > 500)
      .sort((a, b) => a.distanceKm - b.distanceKm || b.elevationDeg - a.elevationDeg);
    nearbyCount = candidates.length;
    aircraft = candidates.map(({ item, distanceKm, altitudeFt }) => ({
      hex: item.hex || "unknown", callsign: item.flight?.trim() || null,
      registration: item.r || null, aircraftType: item.t || null,
      lat: item.lat!, lon: item.lon!, heading: typeof item.track === "number" && Number.isFinite(item.track) ? item.track : null,
      altitudeFt: altitudeFt!, speedKts: typeof item.gs === "number" ? item.gs : null,
      distanceKm, seenSeconds: item.seen_pos ?? item.seen ?? 0,
    }));
    const selected = candidates[0];
    if (selected) {
      const item = selected.item;
      const callsign = item.flight?.trim() || null;
      let origin = null, destination = null;
      let routeSource: "adsbdb" | "airlabs" | null = null;
      let routeStatus: "available" | "missing" | "unverified" | "lookup-error" | "no-callsign" = callsign ? "missing" : "no-callsign";
      if (callsign) {
        try {
          const route = await getJson<RouteResponse>(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`, 3600, 7000);
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
          routeStatus = error instanceof Error && error.message === "Upstream 404" ? "missing" : "lookup-error";
        }
        if (routeStatus !== "available") {
          try {
            const liveRoute = await currentAirLabsRoute(item, callsign);
            if (liveRoute) {
              origin = liveRoute.origin;
              destination = liveRoute.destination;
              routeStatus = "available";
              routeSource = "airlabs";
            }
          } catch (error) { console.error("AirLabs route lookup failed", error instanceof Error ? error.message : error); }
        }
      }
      flight = { hex: item.hex || "unknown", callsign, registration: item.r || null, aircraftType: item.t || null,
        altitudeFt: selected.altitudeFt, speedKts: typeof item.gs === "number" ? item.gs : null,
        distanceKm: selected.distanceKm, elevationDeg: selected.elevationDeg,
        seenSeconds: item.seen_pos ?? item.seen ?? 0, origin, destination, routeStatus, routeSource };
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
  return NextResponse.json({ flight, aircraft, nearbyCount, weather, updatedAt: new Date().toISOString(), warnings }, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=15" } });
}
