import type { MapAircraft } from "./flight-map";
import { positionAtZoneProgress, zoneProgress } from "../lib/zone-progress";

export const demoPlace = { lat: 41.8781, lon: -87.6298, label: "Chicago · sample sky" };

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
    id: "arrival", label: "O’Hare arrival", description: "737-800 · Fort Lauderdale → Chicago",
    scenario: {
      title: "A jet on approach",
      summary: "A fictional United flight crosses central Chicago from southeast to northwest on its way to O’Hare. Its path passes close to the observation point.",
      routeNote: "Illustrative Fort Lauderdale to O’Hare route",
      phases: [
        "Watch the jet enter from the southeast and track northwest toward the city.",
        "The planned track passes almost directly over the sample location.",
        "The jet continues northwest toward O’Hare after crossing the zone.",
      ],
    },
    aircraft: plane("d0a001", "UAL4827", "N742UV", "B738", 41.91455, -87.7239, 295, 4200, 210),
    profile: [{ altitudeFt: 4200, speedKts: 210 }, { altitudeFt: 3500, speedKts: 190 }, { altitudeFt: 2800, speedKts: 170 }],
    origin: { code: "FLL", city: "Ft Lauderdale", lat: 26.073, lon: -80.153 }, destination: { code: "ORD", city: "Chicago", lat: 41.974, lon: -87.907 },
  },
  {
    id: "private-plane", label: "Private crossing", description: "Cessna 310 · lakefront to southwest",
    scenario: {
      title: "A twin-engine city crossing",
      summary: "A fictional Cessna 310 enters from the northeast, crosses north of the observation point, and continues southwest. Airport endpoints are intentionally unspecified.",
      routeNote: "Local crossing · airport endpoints unspecified",
      localSegment: { entry: { code: "NE", city: "Lake Michigan" }, exit: { code: "SW", city: "Southwest Chicago" } },
      phases: [
        "The Cessna enters from the lakefront side of the sample zone.",
        "Its track stays north of the observation point at closest approach.",
        "The Cessna continues southwest across the city.",
      ],
    },
    aircraft: plane("d0a005", "N310JP", "N310JP", "C310", 41.902, -87.656, 242, 2800, 140),
    profile: [{ altitudeFt: 2800, speedKts: 140 }, { altitudeFt: 3200, speedKts: 150 }, { altitudeFt: 3400, speedKts: 155 }],
    origin: null, destination: null,
  },
  {
    id: "helicopter", label: "Helicopter patrol", description: "Bell 407 · low-level city crossing",
    scenario: {
      title: "A low-level patrol",
      summary: "A fictional Bell 407 moves southwest across central Chicago. Its planned path passes close to the sample location, lower and slower than the two planes.",
      routeNote: "Local patrol · airport endpoints unspecified",
      localSegment: { entry: { code: "NE", city: "Lake Michigan" }, exit: { code: "SW", city: "Southwest Chicago" } },
      phases: [
        "The helicopter enters from the northeast at low altitude.",
        "Its track passes close to the observation point near mid-crossing.",
        "The helicopter continues southwest beyond the sample zone.",
      ],
    },
    aircraft: plane("d0a004", "N582QX", "N582QX", "B407", 41.889, -87.617, 232, 1800, 75),
    profile: [{ altitudeFt: 1800, speedKts: 75 }, { altitudeFt: 2200, speedKts: 90 }, { altitudeFt: 2000, speedKts: 80 }],
    origin: null, destination: null,
  },
];

export const demoWeather = { temperatureF: 72, cloudCover: 28, windMph: 9, code: 2, isDay: true };

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
