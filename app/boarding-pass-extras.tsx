export function BoardingPassStats({ altitudeFt, speedKts, distanceKm }: { altitudeFt: number | null; speedKts: number | null; distanceKm: number }) {
  return <div className="boarding-pass-stats" aria-label="Flight position details">
    <div><span>ALTITUDE</span><strong>{altitudeFt == null ? "—" : `${Math.round(altitudeFt).toLocaleString()} ft`}</strong></div>
    <div><span>GROUND SPEED</span><strong>{speedKts == null ? "—" : `${Math.round(speedKts)} kt`}</strong></div>
    <div><span>DISTANCE</span><strong>{distanceKm.toFixed(1)} km</strong></div>
  </div>;
}

export function BoardingPassStub({ callsign, flightNumber, flightIata, airline, aircraftType, aircraftModel, mode }: {
  callsign: string | null;
  flightNumber?: string | null;
  flightIata?: string | null;
  airline?: AirlineIdentity | null;
  aircraftType: string | null;
  aircraftModel?: string | null;
  mode: "live" | "sample";
}) {
  const rawFlight = callsign?.trim().toUpperCase() || null;
  const match = rawFlight?.match(/^([A-Z]{3})(\d+[A-Z]?)$/);
  const number = flightNumber?.trim().toUpperCase() || match?.[2] || null;
  const carrier = airline ?? airlineIdentity(match?.[1]);
  const flightId = flightIata?.trim().toUpperCase() || (carrier?.iata && number ? `${carrier.iata}${number}` : rawFlight);
  const model = displayAircraftType(aircraftType, aircraftModel);
  const typeCode = aircraftType?.trim().toUpperCase();
  return <div className="boarding-pass-stub">
    <div className="boarding-pass-stub-info">
      <span>FLIGHT</span><strong>{flightId || "Local flight"}</strong>
      <span className="boarding-pass-stub-detail">Raw flight <code>{rawFlight || "Unavailable"}</code></span>
      <span className="boarding-pass-stub-detail">Aircraft {model}{typeCode && model.toUpperCase() !== typeCode && <code>{typeCode}</code>}</span>
    </div>
    <span className={`boarding-pass-stub-mode ${mode}`}>{mode === "live" ? "LIVE" : "SAMPLE"}</span>
  </div>;
}
import { airlineIdentity, displayAircraftType, type AirlineIdentity } from "../lib/flight-display";
