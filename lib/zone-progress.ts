export const ZONE_RADIUS_KM = 9.26; // 5 nautical miles, matching the live aircraft search.

type Point = { lat: number; lon: number };
type AircraftPosition = Point & { heading: number | null };

function track(center: Point, aircraft: AircraftPosition, radiusKm: number) {
  if (aircraft.heading == null || !Number.isFinite(aircraft.heading) || radiusKm <= 0) return null;
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLon = kmPerDegreeLat * Math.cos(center.lat * Math.PI / 180);
  if (Math.abs(kmPerDegreeLon) < 0.001) return null;
  const lonDelta = ((aircraft.lon - center.lon + 540) % 360) - 180;
  const east = lonDelta * kmPerDegreeLon;
  const north = (aircraft.lat - center.lat) * kmPerDegreeLat;
  const radians = aircraft.heading * Math.PI / 180;
  const directionEast = Math.sin(radians);
  const directionNorth = Math.cos(radians);
  const alongKm = east * directionEast + north * directionNorth;
  const crossKm = east * directionNorth - north * directionEast;
  if (Math.abs(crossKm) >= radiusKm) return null;
  const halfChordKm = Math.sqrt(radiusKm ** 2 - crossKm ** 2);
  return { alongKm, crossKm, halfChordKm, directionEast, directionNorth, kmPerDegreeLat, kmPerDegreeLon };
}

export function zoneProgress(center: Point, aircraft: AircraftPosition, radiusKm = ZONE_RADIUS_KM) {
  const path = track(center, aircraft, radiusKm);
  if (!path) return null;
  const percent = Math.max(0, Math.min(100, (path.alongKm + path.halfChordKm) / (2 * path.halfChordKm) * 100));
  return { percent, remainingKm: Math.max(0, path.halfChordKm - path.alongKm), crossingKm: 2 * path.halfChordKm, closestKm: Math.abs(path.crossKm), motion: path.alongKm < 0 ? "approaching" as const : "leaving" as const };
}

export function positionAtZoneProgress(center: Point, aircraft: AircraftPosition, percent: number, radiusKm = ZONE_RADIUS_KM) {
  const path = track(center, aircraft, radiusKm);
  if (!path) return null;
  const fraction = Math.max(0, Math.min(100, percent)) / 100;
  const alongKm = -path.halfChordKm + 2 * path.halfChordKm * fraction;
  const east = path.directionEast * alongKm + path.directionNorth * path.crossKm;
  const north = path.directionNorth * alongKm - path.directionEast * path.crossKm;
  return { lat: center.lat + north / path.kmPerDegreeLat, lon: ((center.lon + east / path.kmPerDegreeLon + 540) % 360) - 180 };
}
