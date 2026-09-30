import type { MapAircraft } from "../components/map/flight-map";
import { positionAtZoneProgress, zoneProgress } from "./zone-progress";

export const demoPlace = { lat: 29.7604, lon: -95.3698, label: "Downtown Houston · sample sky" };

type FlightProfilePoint = { altitudeFt: number; speedKts: number };
type FlightProfile = [FlightProfilePoint, FlightProfilePoint, FlightProfilePoint];

type DemoFlight = {
  id: string;
  label: string;
  description: string;
  scenario: {
    title: string;
    summary: string;
    routeNote: string;
    phases: [string, string, string];
    localSegment?: { entry: { code: string; city: string }; exit: { code: string; city: string } };
  };
  aircraft: MapAircraft & { altitudeFt: number };
  profile: FlightProfile;
  origin: { code: string; city: string; lat: number; lon: number } | null;
  destination: { code: string; city: string; lat: number; lon: number } | null;
};

// The three points mark entry, closest approach, and exit from the sample zone.
export function sampleDemoProfile(profile: FlightProfile, progress: number): FlightProfilePoint {
  const clamped = Math.max(0, Math.min(100, progress));
  const segment = clamped < 50 ? 0 : 1;
  const fraction = (clamped - segment * 50) / 50;
  const start = profile[segment];
  const end = profile[segment + 1];
  return {
    altitudeFt: start.altitudeFt + (end.altitudeFt - start.altitudeFt) * fraction,
    speedKts: start.speedKts + (end.speedKts - start.speedKts) * fraction,
  };
}

// Time is proportional to distance divided by speed. Speed changes linearly with
// progress within each half of the crossing, so these values also drive playback.
function segmentTime(startKts: number, endKts: number, fraction = 1) {
  const change = endKts - startKts;
  return Math.abs(change) < 0.000001
    ? fraction / (2 * startKts)
    : Math.log1p(change * fraction / startKts) / (2 * change);
}

function profileTimes(profile: FlightProfile) {
  const first = segmentTime(profile[0].speedKts, profile[1].speedKts);
  const second = segmentTime(profile[1].speedKts, profile[2].speedKts);
  return { first, total: first + second };
}

export function demoCrossingDurationMs(profile: FlightProfile, pathLengthKm: number) {
  return pathLengthKm / 1.852 * profileTimes(profile).total * 3_600_000;
}

export function demoElapsedFractionAtProgress(profile: FlightProfile, progress: number) {
  const clamped = Math.max(0, Math.min(100, progress));
  const segment = clamped < 50 ? 0 : 1;
  const { first, total } = profileTimes(profile);
  const before = segment === 0 ? 0 : first;
  return (before + segmentTime(profile[segment].speedKts, profile[segment + 1].speedKts, (clamped - segment * 50) / 50)) / total;
}

export function demoProgressAtElapsedFraction(profile: FlightProfile, elapsedFraction: number) {
  const { first, total } = profileTimes(profile);
  const target = Math.max(0, Math.min(1, elapsedFraction)) * total;
  const segment = target < first ? 0 : 1;
  const localTime = target - (segment === 0 ? 0 : first);
  const startKts = profile[segment].speedKts;
  const change = profile[segment + 1].speedKts - startKts;
  const fraction = Math.abs(change) < 0.000001
    ? localTime * 2 * startKts
    : startKts * Math.expm1(localTime * 2 * change) / change;
  return Math.max(0, Math.min(100, (segment + fraction) * 50));
}

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
    id: "iah-arrival", label: "Intercontinental arrival", description: "United 737 · Los Angeles → Houston",
    scenario: {
      title: "A jet on approach",
      summary: "A fictional United flight crosses downtown Houston on its way to George Bush Intercontinental Airport. Its path passes close to the observation point.",
      routeNote: "Illustrative Los Angeles to George Bush Intercontinental route",
      phases: [
        "Watch the jet enter southwest of downtown and track northeast across the city.",
        "The planned track passes close to the downtown observation point.",
        "The jet continues northeast toward Intercontinental after crossing the zone.",
      ],
    },
    aircraft: plane("a0b001", "UAL2147", "N782UA", "B738", 29.75, -95.39, 35, 4500, 210),
    profile: [{ altitudeFt: 4500, speedKts: 210 }, { altitudeFt: 3800, speedKts: 190 }, { altitudeFt: 3100, speedKts: 170 }],
    origin: { code: "LAX", city: "Los Angeles", lat: 33.9425, lon: -118.4081 }, destination: { code: "IAH", city: "Houston", lat: 29.9844, lon: -95.3414 },
  },
  {
    id: "private-crossing", label: "Private city crossing", description: "Cessna 310 · west to east",
    scenario: {
      title: "A twin-engine city crossing",
      summary: "A fictional Cessna 310 enters from west Houston, crosses north of the downtown observation point, and continues east. Airport endpoints are intentionally unspecified.",
      routeNote: "Local crossing · airport endpoints unspecified",
      localSegment: { entry: { code: "W", city: "West Houston" }, exit: { code: "E", city: "East Houston" } },
      phases: [
        "The Cessna enters from the west side of the Houston sample zone.",
        "Its track stays north of downtown at closest approach.",
        "The Cessna continues east across the city.",
      ],
    },
    aircraft: plane("a0b002", "N310HT", "N310HT", "C310", 29.784, -95.392, 91, 2600, 135),
    profile: [{ altitudeFt: 2600, speedKts: 135 }, { altitudeFt: 3000, speedKts: 145 }, { altitudeFt: 3200, speedKts: 150 }],
    origin: null, destination: null,
  },
  {
    id: "helicopter", label: "Bayou helicopter", description: "Bell 407 · downtown patrol",
    scenario: {
      title: "A low-level patrol",
      summary: "A fictional Bell 407 patrol moves southwest across downtown Houston. Its planned path passes close to the sample location, lower and slower than the two planes.",
      routeNote: "Local patrol · airport endpoints unspecified",
      localSegment: { entry: { code: "NE", city: "Northeast Houston" }, exit: { code: "SW", city: "Southwest Houston" } },
      phases: [
        "The helicopter enters northeast of downtown at low altitude.",
        "Its track passes close to the downtown observation point near mid-crossing.",
        "The helicopter continues southwest over Houston beyond the sample zone.",
      ],
    },
    aircraft: plane("a0b003", "N407HX", "N407HX", "B407", 29.765, -95.37, 215, 1200, 75),
    profile: [{ altitudeFt: 1200, speedKts: 75 }, { altitudeFt: 1500, speedKts: 85 }, { altitudeFt: 1400, speedKts: 80 }],
    origin: null, destination: null,
  },
];

export const demoWeather = { temperatureF: 84, cloudCover: 34, windMph: 11, code: 2, isDay: true };

export function getDemoSky(presetId?: string | null) {
  const selected = demoFlights.find((item) => item.id === presetId) ?? null;
  const entryPosition = selected ? positionAtZoneProgress(demoPlace, selected.aircraft, 0) : null;
  const aircraft = selected ? {
    ...selected.aircraft,
    ...entryPosition,
    ...sampleDemoProfile(selected.profile, 0),
    distanceKm: entryPosition ? distanceFromDemoPlace(entryPosition.lat, entryPosition.lon) : selected.aircraft.distanceKm,
  } : null;
  return {
    mode: "demo",
    flight: selected && aircraft ? {
      ...aircraft,
      origin: selected.origin,
      destination: selected.destination,
      routeStatus: selected.origin && selected.destination ? "available" : "missing",
      routeSource: null,
      zoneProgress: zoneProgress(demoPlace, aircraft),
    } : null,
    aircraft: aircraft ? [aircraft] : [],
    nearbyCount: aircraft ? 1 : 0,
    weather: demoWeather,
    updatedAt: new Date().toISOString(),
    warnings: [],
  };
}
