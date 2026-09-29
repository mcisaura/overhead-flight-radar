import { MAX_ESTIMATE_SECONDS, distanceKm, estimatePosition } from "./flight-estimate";
import { ZONE_RADIUS_KM } from "./zone-progress";

type Position = { lat: number; lon: number };
type ReportedAircraft = Position & { reportedPosition: Position; heading: number | null; speedKts: number | null; seenSeconds: number };

export function projectLiveAircraft<T extends ReportedAircraft>(aircraft: T[], place: Position, receivedAt: number, now: number) {
  if (!receivedAt) return [];
  const elapsedSeconds = Math.max(0, (now - receivedAt) / 1000);
  return aircraft.map((plane) => {
    const position = estimatePosition({ ...plane.reportedPosition, heading: plane.heading, speedKts: plane.speedKts, seenSeconds: plane.seenSeconds }, elapsedSeconds);
    return { ...plane, lat: position.lat, lon: position.lon, distanceKm: distanceKm(place, position), seenSeconds: position.ageSeconds, estimated: position.estimated };
  }).filter((plane) => plane.seenSeconds <= MAX_ESTIMATE_SECONDS);
}

export function closestLiveAircraft<T extends { hex: string; distanceKm: number; seenSeconds: number }>(aircraft: T[], excludeHex?: string) {
  let closest: T | null = null;
  for (const plane of aircraft) {
    if (plane.hex === excludeHex || !(plane.distanceKm <= ZONE_RADIUS_KM) || !(plane.seenSeconds <= 60)) continue;
    if (!closest || plane.distanceKm < closest.distanceKm || (plane.distanceKm === closest.distanceKm && plane.hex.localeCompare(closest.hex) < 0)) closest = plane;
  }
  return closest;
}
