export function BoardingPassStats({ altitudeFt, speedKts, distanceKm }: { altitudeFt: number | null; speedKts: number | null; distanceKm: number }) {
  return <div className="boarding-pass-stats" aria-label="Flight position details">
    <div><span>ALTITUDE</span><strong>{altitudeFt == null ? "—" : `${Math.round(altitudeFt).toLocaleString()} ft`}</strong></div>
    <div><span>GROUND SPEED</span><strong>{speedKts == null ? "—" : `${Math.round(speedKts)} kt`}</strong></div>
    <div><span>DISTANCE</span><strong>{distanceKm.toFixed(1)} km</strong></div>
  </div>;
}

export function BoardingPassStub({ callsign, flightNumber, mode }: { callsign: string | null; flightNumber?: string | null; mode: "live" | "sample" }) {
  const number = flightNumber?.trim() || callsign?.trim().toUpperCase().match(/^[A-Z]{2,3}(\d+[A-Z]?)$/)?.[1] || null;
  return <div className="boarding-pass-stub">
    <div><span>FLIGHT NUMBER</span><strong title={callsign || undefined}>{number || "Local flight"}</strong></div>
    <span className={`boarding-pass-stub-mode ${mode}`}>{mode === "live" ? "LIVE" : "SAMPLE"}</span>
  </div>;
}
