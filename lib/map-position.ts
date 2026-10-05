// Leaflet projects vector longitudes literally, even when its tiles wrap.
// Keep all overlays in the world copy containing the observation location.
export function longitudeNear(longitude: number, centerLongitude: number) {
  return longitude + 360 * Math.round((centerLongitude - longitude) / 360);
}

type Airport = { lon?: number | null };
type Aircraft = { lon: number; origin?: Airport | null; destination?: Airport | null };

export function mapAircraftForDisplay<T extends Aircraft>(aircraft: T[], centerLongitude: number): T[] {
  const airportForDisplay = (airport: Airport | null | undefined) =>
    airport && typeof airport.lon === "number" && Number.isFinite(airport.lon)
      ? { ...airport, lon: longitudeNear(airport.lon, centerLongitude) } : airport;
  return aircraft.map((plane) => ({
    ...plane,
    lon: longitudeNear(plane.lon, centerLongitude),
    origin: airportForDisplay(plane.origin),
    destination: airportForDisplay(plane.destination),
  }));
}
