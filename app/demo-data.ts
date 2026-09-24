import type { MapAircraft } from "./flight-map";
import { zoneProgress } from "../lib/zone-progress";

export const demoPlace = { lat: 41.8781, lon: -87.6298, label: "Chicago · sample sky" };

type DemoFlight = {
  id: string;
  label: string;
  description: string;
  aircraft: MapAircraft & { altitudeFt: number };
  origin: { code: string; city: string } | null;
  destination: { code: string; city: string } | null;
};

export function distanceFromDemoPlace(lat: number, lon: number) {
  const rad = Math.PI / 180;
  const dLat = (lat - demoPlace.lat) * rad;
  const dLon = (lon - demoPlace.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(demoPlace.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function plane(hex: string, callsign: string, registration: string, aircraftType: string, lat: number, lon: number, heading: number, altitudeFt: number, speedKts: number): MapAircraft & { altitudeFt: number } {
  return { hex, callsign, registration, aircraftType, lat, lon, heading, altitudeFt, speedKts, distanceKm: distanceFromDemoPlace(lat, lon), seenSeconds: 0 };
}

export const demoFlights: DemoFlight[] = [
  {
    id: "arrival", label: "O’Hare arrival", description: "An airliner on approach",
    aircraft: plane("d0a001", "UAL4827", "N742UV", "B738", 41.951, -87.818, 295, 3500, 205),
    origin: { code: "FLL", city: "Ft Lauderdale" }, destination: { code: "ORD", city: "Chicago" },
  },
  {
    id: "cross-country", label: "Cross-country", description: "A jet crossing the city",
    aircraft: plane("d0a002", "AAL3184", "N836AX", "A321", 42.026, -87.532, 82, 33000, 458),
    origin: { code: "LAX", city: "Los Angeles" }, destination: { code: "JFK", city: "New York" },
  },
  {
    id: "cargo", label: "Cargo flight", description: "A freighter heading in",
    aircraft: plane("d0a003", "FDX6204", "N623FX", "B763", 41.752, -87.617, 346, 5700, 225),
    origin: { code: "MEM", city: "Memphis" }, destination: { code: "ORD", city: "Chicago" },
  },
  {
    id: "helicopter", label: "Local helicopter", description: "A short local flight",
    aircraft: plane("d0a004", "N582QX", "N582QX", "B407", 41.889, -87.617, 232, 1200, 85),
    origin: null, destination: null,
  },
];

export const demoWeather = { temperatureF: 72, cloudCover: 28, windMph: 9, code: 2, isDay: true };

export function getDemoSky(presetId?: string | null) {
  const selected = demoFlights.find((item) => item.id === presetId) ?? null;
  return {
    mode: "demo",
    flight: selected ? {
      ...selected.aircraft,
      origin: selected.origin,
      destination: selected.destination,
      routeStatus: selected.origin && selected.destination ? "available" : "missing",
      routeSource: null,
      zoneProgress: zoneProgress(demoPlace, selected.aircraft),
    } : null,
    aircraft: selected ? [selected.aircraft] : [],
    nearbyCount: selected ? 1 : 0,
    weather: demoWeather,
    updatedAt: new Date().toISOString(),
    warnings: [],
  };
}
