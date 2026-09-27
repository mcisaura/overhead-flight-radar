export type AirlineIdentity = { name: string; iata: string | null; color: string; accent: string };

const airlines: Record<string, { name: string; iata: string; color: string; accent: string }> = {
  SWA: { name: "Southwest Airlines", iata: "WN", color: "#304cb2", accent: "#f9bd13" },
  UAL: { name: "United Airlines", iata: "UA", color: "#005da6", accent: "#79c8e8" },
  AAL: { name: "American Airlines", iata: "AA", color: "#164b8e", accent: "#c63945" },
  DAL: { name: "Delta Air Lines", iata: "DL", color: "#971b2f", accent: "#e8b8bc" },
  ASA: { name: "Alaska Airlines", iata: "AS", color: "#01426a", accent: "#b5cc2d" },
  JBU: { name: "JetBlue", iata: "B6", color: "#00205b", accent: "#59cbe8" },
  FFT: { name: "Frontier Airlines", iata: "F9", color: "#317c2b", accent: "#b8d432" },
  NKS: { name: "Spirit Airlines", iata: "NK", color: "#222222", accent: "#ffdf00" },
  FDX: { name: "FedEx Express", iata: "FX", color: "#4d148c", accent: "#ff6600" },
  UPS: { name: "UPS Airlines", iata: "5X", color: "#4b2e18", accent: "#f5b335" },
  BAW: { name: "British Airways", iata: "BA", color: "#075aaa", accent: "#ce1e42" },
  ACA: { name: "Air Canada", iata: "AC", color: "#cf202f", accent: "#f4d9dc" },
};

const aircraftModels: Record<string, string> = {
  B38M: "Boeing 737 MAX 8", B39M: "Boeing 737 MAX 9", B37M: "Boeing 737 MAX 7",
  B738: "Boeing 737-800", B739: "Boeing 737-900", B737: "Boeing 737-700",
  B763: "Boeing 767-300", B77W: "Boeing 777-300ER", B788: "Boeing 787-8",
  B789: "Boeing 787-9", A319: "Airbus A319", A320: "Airbus A320",
  A321: "Airbus A321", A20N: "Airbus A320neo", A21N: "Airbus A321neo",
  A333: "Airbus A330-300", A359: "Airbus A350-900", B407: "Bell 407",
  C310: "Cessna 310", R44: "Robinson R44",
};

export function airlineIdentity(icao: string | null | undefined, iata?: string | null, name?: string | null): AirlineIdentity | null {
  const known = icao ? airlines[icao.toUpperCase()] : undefined;
  if (!known && !name) return null;
  return {
    name: name?.trim() || known!.name,
    iata: iata?.trim().toUpperCase() || known?.iata || null,
    color: known?.color || "#245d73",
    accent: known?.accent || "#85adba",
  };
}

export function displayFlightName(callsign: string | null | undefined, airline?: AirlineIdentity | null, flightNumber?: string | null) {
  const code = callsign?.trim().toUpperCase();
  if (!code) return null;
  const match = code.match(/^([A-Z]{3})(\d+[A-Z]?)$/);
  const identity = airline ?? airlineIdentity(match?.[1]);
  const number = flightNumber?.trim() || match?.[2];
  return identity && number ? `${identity.name} Flight ${number}` : code;
}

export function displayAircraftType(code: string | null | undefined, model?: string | null) {
  const normalized = code?.trim().toUpperCase();
  return model?.trim() || (normalized && aircraftModels[normalized]) || normalized || "Aircraft type unknown";
}

export function splitAircraftDescription(label: string) {
  const detailStart = label.search(/\s+\(|\s+(?:pax|cargo|freighter)$/i);
  return detailStart < 0
    ? { model: label, details: null }
    : { model: label.slice(0, detailStart), details: label.slice(detailStart).trim() };
}

export function airlineLogoUrl(iata: string | null | undefined) {
  return iata && /^[A-Z0-9]{2}$/.test(iata) ? `https://airlabs.co/img/airline/m/${iata}.png` : null;
}
