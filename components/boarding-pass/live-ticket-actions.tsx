import { LocateFixed, PlaneTakeoff, RefreshCw } from "lucide-react";

export default function LiveTicketActions({ locating, onUseLocation, onRefresh, onSimulate }: {
  locating: boolean;
  onUseLocation: () => void;
  onRefresh: () => void;
  onSimulate: () => void;
}) {
  return <div className="live-ticket-actions" role="group" aria-label="Live sky actions">
    <div className="live-location-controls">
      <button type="button" className="primary-button" onClick={onUseLocation} disabled={locating} aria-busy={locating}>
        <LocateFixed size={15} aria-hidden="true" />{locating ? "Locating…" : "Use my location"}
      </button>
      <button type="button" className="ticket-refresh-utility" onClick={onRefresh} aria-label="Refresh sky" title="Refresh sky"><RefreshCw size={15} aria-hidden="true" /></button>
    </div>
    <button type="button" className="refresh-button simulate-flight-button" onClick={onSimulate}><PlaneTakeoff size={15} aria-hidden="true" />Try simulated flights</button>
  </div>;
}
