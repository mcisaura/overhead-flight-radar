export const MAX_ESTIMATE_SECONDS = 90;

type Position = { lat: number; lon: number };
type MovingAircraft = Position & {
  heading: number | null;
  speedKts: number | null;
  seenSeconds: number;
};

export function distanceKm(a: Position, b: Position) {
  const radians = Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * radians;
  const deltaLon = (b.lon - a.lon) * radians;
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(value));
}

export function estimatePosition(aircraft: MovingAircraft, elapsedSeconds: number) {
  const ageSeconds = Math.max(0, aircraft.seenSeconds + elapsedSeconds);
  if (aircraft.heading == null || aircraft.speedKts == null
    || !Number.isFinite(aircraft.heading) || !Number.isFinite(aircraft.speedKts)
    || aircraft.speedKts <= 0 || aircraft.seenSeconds >= MAX_ESTIMATE_SECONDS) {
    return { lat: aircraft.lat, lon: aircraft.lon, ageSeconds, estimated: false };
  }

  const projectedSeconds = Math.min(ageSeconds, MAX_ESTIMATE_SECONDS);
  const angularDistance = aircraft.speedKts * 1.852 * projectedSeconds / 3600 / 6371;
  const heading = aircraft.heading * Math.PI / 180;
  const latitude = aircraft.lat * Math.PI / 180;
  const longitude = aircraft.lon * Math.PI / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance)
    + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(heading),
  );
  const nextLongitude = longitude + Math.atan2(
    Math.sin(heading) * Math.sin(angularDistance) * Math.cos(latitude),
    Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(nextLatitude),
  );
  return {
    lat: nextLatitude * 180 / Math.PI,
    lon: ((nextLongitude * 180 / Math.PI + 540) % 360) - 180,
    ageSeconds,
    estimated: projectedSeconds > 0,
  };
}
