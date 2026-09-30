import { displayAircraftType } from "./flight-display";

export function aircraftSearchLink(code?: string | null, model?: string | null) {
  const name = displayAircraftType(code, model);
  if (name === "Aircraft type unknown" || !/[A-Z0-9]/i.test(name)) return null;
  const query = `${name} aircraft`;
  return { name, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
}
