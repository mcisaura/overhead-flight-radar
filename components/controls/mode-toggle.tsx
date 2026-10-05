"use client";

import SlidingChoiceGroup from "./sliding-choice-group";
import { Play } from "lucide-react";

export default function ModeToggle({ mode, onChange }: { mode: "live" | "demo"; onChange: (mode: "live" | "demo") => void }) {
  return <SlidingChoiceGroup className={`mode-toggle mode-toggle-${mode}`} label="Data mode" motionKey="mode" selectedIndex={mode === "live" ? 0 : 1}>
    <button type="button" title="Live aircraft near your location" aria-pressed={mode === "live"} onClick={() => onChange("live")}><span className="mode-live-dot" aria-hidden="true" />Live</button>
    <button type="button" title="Try simulated flights" aria-pressed={mode === "demo"} onClick={() => onChange("demo")}><Play className="mode-demo-icon" size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />Demo</button>
  </SlidingChoiceGroup>;
}
