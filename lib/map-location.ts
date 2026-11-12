// Keep selectable locations inside the usable Web Mercator map area.
// Use a round, slightly conservative limit below the projection's pole singularity.
export const MAX_MAP_LATITUDE = 85;

export function isSupportedMapLocation(lat: number, lon: number) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && Math.abs(lat) <= MAX_MAP_LATITUDE && Math.abs(lon) <= 180;
}

export function clampMapLatitude(lat: number) {
  return Math.max(-MAX_MAP_LATITUDE, Math.min(MAX_MAP_LATITUDE, lat));
}

export function wrapMapLongitude(lon: number) {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}
