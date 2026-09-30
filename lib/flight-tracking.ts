export type FlightTrackingIdentity = {
  callsign?: string | null;
  registration?: string | null;
};

/** Ident pages need no provider API; they may show the latest flight or history. */
export function flightTrackingLink({ callsign, registration }: FlightTrackingIdentity) {
  const flight = callsign?.trim().toUpperCase();
  const tail = registration?.trim().toUpperCase();
  const identifier = flight && /^[A-Z0-9]{2,8}$/.test(flight) && /[A-Z]/.test(flight) && /\d/.test(flight)
    ? flight
    : tail && /^[A-Z0-9]{1,3}-?[A-Z0-9]{2,8}$/.test(tail) && /[A-Z]/.test(tail) && !/^(UNKNOWN|NONE|NULL)$/.test(tail)
      ? tail.replace(/-/g, "") : null;
  return identifier ? { identifier, url: `https://www.flightaware.com/live/flight/${identifier}` } : null;
}
