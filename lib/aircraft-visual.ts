import type { AirlineIdentity } from "./flight-display";

export type AircraftVisual = "airliner" | "small" | "helicopter";

type FlightIdentity = {
  aircraftType?: string | null;
  aircraftModel?: string | null;
  airline?: AirlineIdentity | null;
};

// AirLabs supplies an ICAO designator and sometimes a readable model name.
// Known type codes take priority over model-name hints; operators do not affect size.
const helicopterCodes = new Set([
  "R22", "R44", "R66", "B06", "B204", "B205", "B206", "B212",
  "B222", "B230", "B407", "B412", "B427", "B429", "B430", "B505",
  "AS32", "AS50", "AS55", "AS65", "EC20", "EC30", "EC35", "EC45", "EC55",
  "H125", "H130", "H135", "H145", "H160", "S61", "S64", "S70",
  "S76", "S92", "A109", "A119", "A139", "A169", "A189", "MD52",
  "MD60", "MI8", "MI17", "KA32", "UH1", "UH60", "H60", "V22", "UHEL",
]);

const lightAircraftCodes = /^(?:C(?:[1-7]\d{2}|\d{2}[A-Z])|P28[A-Z]|PA\d{2}|BE\d{2}|B350|SR\d{2}|DA\d{2}|PC\d{2}|TBM\d|M20[A-Z]?|E5\d[PJ]|LJ\d{2}|GLF\d|G\d{3}|SF50)$/;
const businessJetCodes = new Set([
  "E545", "E550", "E35L", "CL30", "CL35", "CL60",
  "GLEX", "GL5T", "GL6T", "GL7T", "F2TH", "F900",
  "FA10", "FA20", "FA50", "FA7X", "FA8X", "GALX", "ASTR",
  "H25B", "H25C", "HA4T",
]);
const airlinerCodes = /^(?:A3\d{2}|A20N|A21N|A22N|BCS[13]|B7\d{2}|B3[789]M|B77[WFL]|B78X|E1\d{2}|E2\d{2}|E7[05][A-Z]|CRJ\d|DH8[A-D]|AT\d{2}|SF34|MD\d{2}|DC\d{2}|F(?:27|28|50|60|70|100))$/;

export function aircraftVisualForFlight(flight: FlightIdentity): AircraftVisual {
  const code = flight.aircraftType?.trim().toUpperCase() ?? "";
  const model = flight.aircraftModel?.trim() ?? "";

  if (helicopterCodes.has(code)) return "helicopter";
  if (lightAircraftCodes.test(code) || businessJetCodes.has(code)) return "small";
  if (airlinerCodes.test(code)) return "airliner";

  if (/\b(?:helicopter|rotorcraft|rotary.?wing|gyroplane|autogyro|tilt.?rotor|robinson|bell \d{3}|airbus helicopters|eurocopter|sikorsky|agustawestland)\b/i.test(model)) {
    return "helicopter";
  }
  if (/\b(?:cessna|piper|cirrus|beechcraft|diamond aircraft|pilatus|mooney|bonanza|citation|learjet|gulfstream|hondajet|king air|private jet|business jet|legacy|praetor|phenom|challenger|global|falcon)\b/i.test(model)) {
    return "small";
  }
  if (/\b(?:boeing|airbus|airliner|regional jet|embraer e-?jet|embraer (?:1[0479]0|1[4579]5|19[05]-e2)|bombardier crj|dash ?8|atr ?\d{2}|fokker (?:27|28|50|60|70|100))\b/i.test(model)) {
    return "airliner";
  }
  // An unknown type gets a generic small illustration rather than assuming size
  // from the presence of an airline or charter operator.
  return "small";
}
