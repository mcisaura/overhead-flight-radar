"use client";

export default function ModeToggle({ mode, onChange }: { mode: "live" | "sandbox"; onChange: (mode: "live" | "sandbox") => void }) {
  return <div className="mode-toggle" role="group" aria-label="Data mode">
    <button type="button" aria-pressed={mode === "live"} onClick={() => onChange("live")}>Live</button>
    <button type="button" aria-pressed={mode === "sandbox"} onClick={() => onChange("sandbox")}>Sandbox</button>
  </div>;
}
