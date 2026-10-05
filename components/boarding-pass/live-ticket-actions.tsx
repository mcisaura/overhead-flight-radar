import { LocateFixed, PlaneTakeoff, RefreshCw } from "lucide-react";

export default function LiveTicketActions({ locating, onUseLocation, onRefresh, onSimulate }: {
  locating: boolean;
  onUseLocation: () => void;
  onRefresh: () => void;
  onSimulate: () => void;
}) {
  return <div className="live-ticket-actions" role="group" aria-label="Live sky actions">
    <button type="button" className="primary-button" onClick={onUseLocation} disabled={locating} aria-busy={locating}>
      <LocateFixed size={15} aria-hidden="true" />{locating ? "Locating…" : "Use my location"}
    </button>
    <button type="button" className="refresh-button" onClick={onRefresh}><RefreshCw size={15} aria-hidden="true" />Refresh</button>
    <button type="button" className="refresh-button simulate-flight-button" onClick={onSimulate}><PlaneTakeoff size={15} aria-hidden="true" />Simulate a flight</button>
  </div>;
}
