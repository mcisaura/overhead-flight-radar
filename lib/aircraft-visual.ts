import type { AirlineIdentity } from "./flight-display";

export type AircraftVisual = "airliner" | "private" | "helicopter";

type FlightIdentity = {
  aircraftType?: string | null;
  aircraftModel?: string | null;
  airline?: AirlineIdentity | null;
};

// AirLabs supplies an ICAO designator and sometimes a readable model name.
// Explicit rotorcraft and light-aircraft types take priority over airline data.
const helicopterCodes = new Set([
  "R22", "R44", "R66", "B06", "B204", "B205", "B206", "B212",
  "B222", "B230", "B407", "B412", "B427", "B429", "B430", "B505",
  "AS32", "AS50", "AS55", "AS65", "EC20", "EC30", "EC35", "EC45", "EC55",
  "H125", "H130", "H135", "H145", "H160", "S61", "S64", "S70",
  "S76", "S92", "A109", "A119", "A139", "A169", "A189", "MD52",
  "MD60", "MI8", "MI17", "KA32", "UH1", "UH60", "H60", "V22", "UHEL",
]);

const lightAircraftCodes = /^(?:C(?:[1-7]\d{2}|\d{2}[A-Z])|P28[A-Z]|PA\d{2}|BE\d{2}|B350|SR\d{2}|DA\d{2}|PC\d{2}|TBM\d|M20[A-Z]?|E5\d[PJ]|LJ\d{2}|GLF\d|G\d{3}|SF50)$/;
const airlinerCodes = /^(?:A3\d{2}|A20N|A21N|A22N|B7\d{2}|B3[789]M|B77[WFL]|E1\d{2}|E2\d{2}|E7[05][A-Z]|CRJ\d|DH8[A-D]|AT\d{2}|SF34|MD\d{2}|DC\d{2}|F\d{2,3})$/;

export function aircraftVisualForFlight(flight: FlightIdentity): AircraftVisual {
  const code = flight.aircraftType?.trim().toUpperCase() ?? "";
  const model = flight.aircraftModel?.trim() ?? "";

  if (helicopterCodes.has(code)
    || /\b(?:helicopter|rotorcraft|rotary.?wing|gyroplane|autogyro|tilt.?rotor|robinson|bell \d{3}|airbus helicopters|eurocopter|sikorsky|agustawestland)\b/i.test(model)) {
    return "helicopter";
  }
  if (lightAircraftCodes.test(code)
    || /\b(?:cessna|piper|cirrus|beechcraft|diamond aircraft|pilatus|mooney|bonanza|citation|learjet|gulfstream|hondajet|king air|private jet|business jet)\b/i.test(model)) {
    return "private";
  }
  if (airlinerCodes.test(code)
    || /\b(?:boeing|airbus|airliner|regional jet|embraer e-?jet|bombardier crj|dash ?8|atr ?\d{2})\b/i.test(model)
    || flight.airline) {
    return "airliner";
  }
  return code || model ? "private" : "airliner";
}
