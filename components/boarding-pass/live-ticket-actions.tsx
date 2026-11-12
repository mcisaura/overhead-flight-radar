import { PlaneTakeoff, RefreshCw } from "lucide-react";

import LocationSplitButton from "../controls/location-split-button";

export default function LiveTicketActions({ locating, onUseLocation, onRefresh, onSimulate, onChooseLocation, zoneSettingsOpen }: {
  locating: boolean;
  onUseLocation: () => void;
  onRefresh: () => void;
  onSimulate: () => void;
  onChooseLocation: () => void;
  zoneSettingsOpen: boolean;
}) {
  return <div className="live-ticket-actions" role="group" aria-label="Live sky actions">
    <div className="live-location-controls">
      <LocationSplitButton locating={locating} onUseLocation={onUseLocation} onChooseLocation={onChooseLocation} open={zoneSettingsOpen} />
      <button type="button" className="ticket-refresh-utility" onClick={onRefresh} aria-label="Refresh sky" title="Refresh sky"><RefreshCw size={15} aria-hidden="true" /></button>
    </div>
    <button type="button" className="refresh-button simulate-flight-button" onClick={onSimulate}><PlaneTakeoff size={15} aria-hidden="true" />Try simulated flights</button>
  </div>;
}
