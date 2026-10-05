import AircraftTypeLink from "./aircraft-type-link";
import FlightLink from "./flight-link";
import BoardingBarcode from "./boarding-barcode";
import type { ReactNode } from "react";
import { airlineIdentity, formatDistanceNm, type AirlineIdentity } from "../../lib/flight-display";

export function BoardingPassStats({ altitudeFt, speedKts, distanceKm }: { altitudeFt: number | null; speedKts: number | null; distanceKm: number }) {
  return <div className="boarding-pass-stats" aria-label="Flight position details">
    <div><span>ALTITUDE</span><strong>{altitudeFt == null ? "—" : `${Math.round(altitudeFt).toLocaleString()} ft`}</strong></div>
    <div><span>GROUND SPEED</span><strong>{speedKts == null ? "—" : `${Math.round(speedKts)} kt`}</strong></div>
    <div><span>DISTANCE</span><strong>{formatDistanceNm(distanceKm)}</strong></div>
  </div>;
}

export function BoardingPassStub({ callsign, flightNumber, flightIata, airline, aircraftType, aircraftModel, registration, demo = false, barcode = false, children }: {
  callsign: string | null;
  registration?: string | null;
  demo?: boolean;
  barcode?: boolean;
  flightNumber?: string | null;
  flightIata?: string | null;
  airline?: AirlineIdentity | null;
  aircraftType: string | null;
  aircraftModel?: string | null;
  children: ReactNode;
}) {
  const rawFlight = callsign?.trim().toUpperCase() || null;
  const match = rawFlight?.match(/^([A-Z]{3})(\d+[A-Z]?)$/);
  const number = flightNumber?.trim().toUpperCase() || match?.[2] || null;
  const carrier = airline ?? airlineIdentity(match?.[1]);
  const publicCode = flightIata?.trim().toUpperCase() || (carrier?.iata && number ? `${carrier.iata}${number}` : null);
  const aircraftCode = aircraftType?.trim().toUpperCase() || null;

  return <div className="boarding-pass-stub" aria-label="Flight identifiers and details">
    <div className="boarding-pass-stub-codes">
      <div><span>FLIGHT CODE · IATA</span><strong>{publicCode ? <FlightLink callsign={callsign} registration={registration} demo={demo}>{publicCode}</FlightLink> : "—"}</strong></div>
      <div><span>{match ? "CALLSIGN · ICAO" : "RADIO ID / REG"}</span><strong>{rawFlight && rawFlight !== publicCode ? <FlightLink callsign={callsign} registration={registration} demo={demo}>{rawFlight}</FlightLink> : "—"}</strong></div>
      <div><span>AIRCRAFT TYPE</span><strong>{aircraftCode ? <AircraftTypeLink code={aircraftCode} model={aircraftModel}>{aircraftCode}</AircraftTypeLink> : "—"}</strong></div>
    </div>
    <div className="boarding-pass-stub-details">{barcode && <BoardingBarcode />}{children}</div>
  </div>;
}
