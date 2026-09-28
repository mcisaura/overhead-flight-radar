import type { MapAircraft } from "../../flight-map";

export const houstonPlace = { lat: 29.7604, lon: -95.3698, label: "Downtown Houston · sample sky" };
export const houstonWeather = { temperatureF: 84, cloudCover: 34, windMph: 11 };

type ProfilePoint = { altitudeFt: number; speedKts: number };
type Airport = { code: string; city: string; lat: number; lon: number };
type SegmentEnd = { code: string; city: string };

export type HoustonFlight = {
  id: string;
  label: string;
  description: string;
  tag: string;
  aircraft: MapAircraft & { altitudeFt: number };
  profile: [ProfilePoint, ProfilePoint, ProfilePoint];
  origin: Airport | null;
  destination: Airport | null;
  localSegment?: { entry: SegmentEnd; exit: SegmentEnd };
  routeNote: string;
};

export function distanceFromHouston(lat: number, lon: number) {
  const rad = Math.PI / 180;
  const dLat = (lat - houstonPlace.lat) * rad;
  const dLon = (lon - houstonPlace.lon) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(houstonPlace.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function aircraft(hex: string, callsign: string, registration: string, aircraftType: string, lat: number, lon: number, heading: number, altitudeFt: number, speedKts: number): MapAircraft & { altitudeFt: number } {
  return { hex, callsign, registration, aircraftType, lat, lon, heading, altitudeFt, speedKts, distanceKm: distanceFromHouston(lat, lon), seenSeconds: 0 };
}

// Fictional tracks and telemetry for a fixed 30-second demonstration.
export const houstonFlights: HoustonFlight[] = [
  {
    id: "iah-arrival", label: "Intercontinental arrival", description: "United 737 · Los Angeles → Houston", tag: "Commercial",
    aircraft: aircraft("a0b001", "UAL2147", "N782UA", "B738", 29.75, -95.39, 35, 4500, 210),
    profile: [{ altitudeFt: 4500, speedKts: 210 }, { altitudeFt: 3800, speedKts: 190 }, { altitudeFt: 3100, speedKts: 170 }],
    origin: { code: "LAX", city: "Los Angeles", lat: 33.9425, lon: -118.4081 },
    destination: { code: "IAH", city: "Houston", lat: 29.9844, lon: -95.3414 },
    routeNote: "Illustrative arrival toward George Bush Intercontinental Airport",
  },
  {
    id: "private-crossing", label: "Private city crossing", description: "Cessna 310 · west to east", tag: "Private",
    aircraft: aircraft("a0b002", "N310HT", "N310HT", "C310", 29.784, -95.392, 91, 2600, 135),
    profile: [{ altitudeFt: 2600, speedKts: 135 }, { altitudeFt: 3000, speedKts: 145 }, { altitudeFt: 3200, speedKts: 150 }],
    origin: null, destination: null,
    localSegment: { entry: { code: "W", city: "West Houston" }, exit: { code: "E", city: "East Houston" } },
    routeNote: "Local crossing · airport endpoints unspecified",
  },
  {
    id: "helicopter", label: "Bayou helicopter", description: "Bell 407 · downtown patrol", tag: "Rotorcraft",
    aircraft: aircraft("a0b003", "N407HX", "N407HX", "B407", 29.765, -95.37, 215, 1200, 75),
    profile: [{ altitudeFt: 1200, speedKts: 75 }, { altitudeFt: 1500, speedKts: 85 }, { altitudeFt: 1400, speedKts: 80 }],
    origin: null, destination: null,
    localSegment: { entry: { code: "NE", city: "Northeast" }, exit: { code: "SW", city: "Southwest" } },
    routeNote: "Local patrol · airport endpoints unspecified",
  },
];
