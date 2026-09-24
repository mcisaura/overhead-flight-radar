import { Plane } from "lucide-react";

type Airport = { code: string; city: string } | null;

export default function BoardingRoute({ origin, destination }: { origin: Airport; destination: Airport }) {
  return <div className="boarding-route" aria-label={`${origin?.city ?? "Unknown origin"} to ${destination?.city ?? "unknown destination"}`}>
    <div className="boarding-route-stop">
      <span className="boarding-route-label">FROM</span>
      <strong>{origin?.code ?? "—"}</strong>
      <span className="boarding-route-city">{origin?.city ?? "Origin unknown"}</span>
    </div>
    <span className="boarding-route-connector" aria-hidden="true"><Plane size={16} strokeWidth={1.8} /></span>
    <div className="boarding-route-stop boarding-route-destination">
      <span className="boarding-route-label">TO</span>
      <strong>{destination?.code ?? "—"}</strong>
      <span className="boarding-route-city">{destination?.city ?? "Destination unknown"}</span>
    </div>
  </div>;
}
