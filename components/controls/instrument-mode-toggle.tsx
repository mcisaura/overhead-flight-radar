"use client";

import SlidingChoiceGroup from "./sliding-choice-group";

export default function InstrumentModeToggle({ mode, onChange }: {
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
        <svg className="instrument-demo-path" width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path className="instrument-demo-trail" d="M3 16c-1.5-4 5-2 5-5 0-2-4-1.5-3-4" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.5 2.5" strokeLinecap="round" />
          <path d="m9 5 8-3-3 8-1.4-3.6L9 5Z" fill="currentColor" />
        </svg>
        Demo
      </button>
    </SlidingChoiceGroup>
  </div>;
}
