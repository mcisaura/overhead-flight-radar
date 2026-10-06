"use client";

import SlidingChoiceGroup from "./sliding-choice-group";
import FlightPathIcon from "./flight-path-icon";

export default function ModeToggle({ mode, onChange }: {
  mode: "live" | "demo";
  onChange: (mode: "live" | "demo") => void;
}) {
  return <div className="instrument-mode-panel mode-toggle" data-mode={mode}>
    <SlidingChoiceGroup className="instrument-mode-toggle" label="Data mode" motionKey="mode" selectedIndex={mode === "live" ? 0 : 1}>
      <button type="button" title="Live · actual aircraft nearby" aria-pressed={mode === "live"} onClick={() => onChange("live")}>
        <svg className="instrument-live-signal" width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="2" fill="currentColor" />
          <path d="M6.5 6.5a5 5 0 0 0 0 7m7-7a5 5 0 0 1 0 7M3.5 3.5a9.2 9.2 0 0 0 0 13m13-13a9.2 9.2 0 0 1 0 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Live
      </button>
      <button type="button" title="Demo · simulated flights" aria-pressed={mode === "demo"} onClick={() => onChange("demo")}>
        <FlightPathIcon className="instrument-demo-path" />
        Demo
      </button>
    </SlidingChoiceGroup>
  </div>;
}
