"use client";

import InstrumentModeToggle from "./instrument-mode-toggle";

export default function ModeToggle({ mode, onChange }: { mode: "live" | "demo"; onChange: (mode: "live" | "demo") => void }) {
  return <InstrumentModeToggle mode={mode} onChange={onChange} />;
}
