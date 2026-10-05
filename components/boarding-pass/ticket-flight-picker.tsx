import { useEffect, useRef, useState } from "react";
import { Helicopter, Plane, PlaneLanding } from "lucide-react";
import { demoFlights } from "../../lib/demo-data";
import { aircraftVisualForFlight } from "../../lib/aircraft-visual";

export default function TicketFlightPicker({ onSelect }: { onSelect: (id: string) => void }) {
  const pickerRef = useRef<HTMLElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  useEffect(() => { pickerRef.current?.focus({ preventScroll: true }); }, []);
  const preview = demoFlights.find((item) => item.id === previewId);
  const previewRoute = preview?.origin && preview.destination
    ? `${preview.origin.code} → ${preview.destination.code}`
    : preview?.scenario.localSegment ? `${preview.scenario.localSegment.entry.code} → ${preview.scenario.localSegment.exit.code}` : "";
  return <section className="ticket-flight-picker" aria-label="Choose a flight" ref={pickerRef} tabIndex={-1} onMouseLeave={(event) => {
    if (!event.currentTarget.contains(document.activeElement)) setPreviewId(null);
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setPreviewId(null);
  }}>
    <div className="ticket-picker-heading"><span>30 sec simulation</span></div>
    <ol>{demoFlights.map((item) => {
      const kind = aircraftVisualForFlight(item.aircraft);
      const label = kind === "airliner" ? "Big plane" : kind === "small" ? "Small plane" : "Helicopter";
      const Icon = kind === "airliner" ? PlaneLanding : kind === "small" ? Plane : Helicopter;
      return <li key={item.id}><button type="button" className={`ticket-flight-badge ticket-flight-badge-${kind}`} aria-label={`Simulate ${label.toLowerCase()}: ${item.label}. ${item.description}`} title={`${item.label} · ${item.description}`} onMouseEnter={() => setPreviewId(item.id)} onFocus={() => setPreviewId(item.id)} onClick={() => onSelect(item.id)}>
        <span className="ticket-badge-icon"><Icon size={34} strokeWidth={1.4} aria-hidden="true" /></span>
        <span className="ticket-badge-copy">
          <span className="ticket-badge-label">{label}</span>
          <small className="ticket-badge-info">{item.description.split(" · ")[0]}</small>
        </span>
      </button></li>;
    })}</ol>
    <div className="ticket-picker-detail" aria-live="polite">
      <div className="ticket-picker-caption" key={previewId ?? "idle"}>
        {preview ? <><span className="ticket-picker-flight-name">{preview.label}</span><span className="ticket-picker-route">{previewRoute}</span></> : <span className="ticket-picker-caption-idle">Houston · fictional flights</span>}
      </div>
    </div>
  </section>;
}
