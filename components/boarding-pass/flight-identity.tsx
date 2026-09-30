"use client";

import { useState } from "react";
import { airlineIdentity, airlineLogoUrl, displayAircraftType, displayFlightName, type AirlineIdentity } from "../../lib/flight-display";
import AircraftModelLabel from "./aircraft-model-label";

type Props = {
  callsign: string | null;
  aircraftType: string | null;
  registration?: string | null;
  hex?: string | null;
  airline?: AirlineIdentity | null;
  flightNumber?: string | null;
  aircraftModel?: string | null;
};

export function flightIdentityText({ callsign, registration, hex, airline, flightNumber }: Props) {
  return displayFlightName(callsign, airline, flightNumber) || registration || hex?.toUpperCase() || "Aircraft";
}

export default function FlightIdentity(props: Props) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const parsedIcao = props.callsign?.trim().toUpperCase().match(/^([A-Z]{3})\d/)?.[1];
  const airline = props.airline ?? airlineIdentity(parsedIcao);
  const logo = airlineLogoUrl(airline?.iata);
  const name = airline?.name || flightIdentityText({ ...props, airline });
  const model = displayAircraftType(props.aircraftType, props.aircraftModel);
  return <div className="hero-flight-identity">
    {airline && <span className="airline-badge" style={{ color: airline.color, borderColor: airline.color, boxShadow: `inset 0 -5px 0 ${airline.accent}, 0 4px 11px #17374622` }} title={airline.name}>
      {logo && failedLogo !== logo ? <img src={logo} alt={`${airline.name} logo`} onError={() => setFailedLogo(logo)} /> : <span className="airline-badge-fallback" aria-label={airline.name}>{airline.iata || airline.name.slice(0, 2).toUpperCase()}</span>}
    </span>}
    <div className="flight-identity-copy"><strong title={props.callsign || undefined} tabIndex={props.callsign ? 0 : undefined}>{name}</strong><span title={props.aircraftType || undefined} tabIndex={props.aircraftType ? 0 : undefined}><AircraftModelLabel label={model} /></span></div>
  </div>;
}
