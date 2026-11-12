import { ChevronDown, LocateFixed } from "lucide-react";

export default function LocationSplitButton({ locating, onUseLocation, onChooseLocation, open }: {
  locating: boolean; onUseLocation: () => void; onChooseLocation: () => void; open: boolean;
}) {
  return <div className="location-split-button" role="group" aria-label="Choose sky location">
    <button type="button" className="primary-button" onClick={onUseLocation} disabled={locating} aria-busy={locating}><LocateFixed size={15} aria-hidden="true" />{locating ? "Locating…" : "Use my location"}</button>
    <button type="button" className="primary-button location-options-button" onClick={onChooseLocation} aria-label="Choose location and zone" title="Choose location and zone" aria-haspopup="dialog" aria-expanded={open} aria-controls="sky-zone-panel"><ChevronDown size={15} aria-hidden="true" /></button>
  </div>;
}
