"use client";

export default function ModeToggle({ mode, onChange }: { mode: "live" | "demo"; onChange: (mode: "live" | "demo") => void }) {
  return <div className="mode-toggle" role="group" aria-label="Data mode">
    <button type="button" aria-pressed={mode === "live"} onClick={() => onChange("live")}>Live</button>
    <button type="button" aria-pressed={mode === "demo"} onClick={() => onChange("demo")}>Demo</button>
  </div>;
}
