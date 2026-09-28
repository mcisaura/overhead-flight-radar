const EARTH_RADIUS_KM = 6371;

type Point = { lat: number | null; lon: number | null };

function hasCoordinates(point: Point | null): point is { lat: number; lon: number } {
  return Boolean(point && typeof point.lat === "number" && Number.isFinite(point.lat) && typeof point.lon === "number" && Number.isFinite(point.lon));
}

function radians(value: number) {
  return value * Math.PI / 180;
}

function angularDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(b.lon - a.lon);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

function initialBearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const deltaLon = radians(b.lon - a.lon);
  return Math.atan2(
    Math.sin(deltaLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon),
  );
}

function distanceToRouteKm(position: { lat: number; lon: number }, origin: { lat: number; lon: number }, destination: { lat: number; lon: number }) {
  const routeDistance = angularDistance(origin, destination);
  if (routeDistance < 0.000001) return angularDistance(origin, position) * EARTH_RADIUS_KM;

  const originToPosition = angularDistance(origin, position);
  const bearingDifference = initialBearing(origin, position) - initialBearing(origin, destination);
  const crossTrack = Math.asin(Math.max(-1, Math.min(1, Math.sin(originToPosition) * Math.sin(bearingDifference))));
  const alongTrack = Math.atan2(
    Math.sin(originToPosition) * Math.cos(bearingDifference),
    Math.cos(originToPosition),
  );

  if (alongTrack < 0) return originToPosition * EARTH_RADIUS_KM;
  if (alongTrack > routeDistance) return angularDistance(destination, position) * EARTH_RADIUS_KM;
  return Math.abs(crossTrack) * EARTH_RADIUS_KM;
}

export function reportedRouteIsPlausible(position: Point, origin: Point | null, destination: Point | null) {
  if (!hasCoordinates(position) || !hasCoordinates(origin) || !hasCoordinates(destination)) return true;
  const routeLengthKm = angularDistance(origin, destination) * EARTH_RADIUS_KM;
  // Allow normal airway routing and diversions, while rejecting clearly stale
  // endpoint matches such as a New England route attached to an aircraft in Texas.
  const corridorKm = Math.max(185, Math.min(500, routeLengthKm * 0.15));
  return distanceToRouteKm(position, origin, destination) <= corridorKm;
}
