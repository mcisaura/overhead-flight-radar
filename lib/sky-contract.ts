import type { AirlineIdentity } from "./flight-display";

export type AirportPoint = { code: string; city: string; lat: number | null; lon: number | null };
export type RouteStatus = "verified" | "unverified" | "implausible" | "missing";

export type SkyAircraft = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  airlineIcao: string | null;
  airlineIata: string | null;
  flightNumber: string | null;
  originCode: string | null;
  destinationCode: string | null;
  origin: AirportPoint | null;
  destination: AirportPoint | null;
  routeStatus: RouteStatus;
  lat: number;
  lon: number;
  reportedPosition: { lat: number; lon: number };
  heading: number | null;
  altitudeFt: number | null;
  speedKts: number | null;
  distanceKm: number;
  seenSeconds: number;
  airline?: AirlineIdentity | null;
  displayName?: string;
  displayType?: string;
  aircraftModel?: string | null;
};

export type SkyFlight = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  airline: AirlineIdentity | null;
  flightNumber: string | null;
  flightIata: string | null;
  aircraftModel: string | null;
  altitudeFt: number | null;
  speedKts: number | null;
  distanceKm: number;
  elevationDeg: number | null;
  seenSeconds: number;
  origin: AirportPoint | null;
  destination: AirportPoint | null;
  routeStatus: RouteStatus;
  routeSource: "airlabs";
  reportedPosition: { lat: number; lon: number };
  estimatedPosition: { lat: number; lon: number };
  zoneProgress: { percent: number; remainingKm: number; crossingKm: number; closestKm: number; motion: "approaching" | "leaving" } | null;
};

export type SkyResponse = {
  flight: SkyFlight | null;
  aircraft: SkyAircraft[];
  nearbyCount: number;
  weather: { temperatureF: number; cloudCover: number; windMph: number; code: number; isDay: boolean } | null;
  updatedAt: string;
  warnings: string[];
};
