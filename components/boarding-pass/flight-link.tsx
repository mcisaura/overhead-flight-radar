import type { ReactNode } from "react";
import { flightTrackingLink, type FlightTrackingIdentity } from "../../lib/flight-tracking";

export default function FlightLink({ callsign, registration, demo = false, children }: FlightTrackingIdentity & { demo?: boolean; children?: ReactNode }) {
  const link = demo ? null : flightTrackingLink({ callsign, registration });
  if (!link) return <>{children}</>;
  return <a className="flight-tracking-link" href={link.url} target="_blank" rel="noopener noreferrer" title={`View ${link.identifier} on FlightAware (opens in a new tab)`}>
    {children}<span className="sr-only"> (view on FlightAware, opens in a new tab)</span>
  </a>;
}
