import { Move } from "lucide-react";

function MouseButton({ side }: { side: "left" | "right" }) {
  return <svg width="18" height="24" viewBox="0 0 24 30" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <path d={side === "left" ? "M12 3C8.1 3 5 6.1 5 10v3h7V3Z" : "M12 3c3.9 0 7 3.1 7 7v3h-7V3Z"} fill="currentColor" fillOpacity=".2" stroke="none" />
    <rect x="4" y="2" width="16" height="26" rx="8" />
    <path d="M12 3v10M5 13h14" />
  </svg>;
}

export default function SkyInteractionHint() {
  return <span className="aircraft-model-caption aircraft-interaction-hint">
    <span className="hint-mouse">
      <span className="hint-control"><MouseButton side="left" /><span className="hint-control-copy"><strong>Move</strong><small>Drag</small></span></span>
      <span className="hint-divider" aria-hidden="true" />
      <span className="hint-control"><MouseButton side="right" /><span className="hint-control-copy"><strong>Rotate</strong><small>Right-drag</small></span></span>
    </span>
    <span className="hint-touch"><span className="hint-control"><Move size={18} strokeWidth={1.4} aria-hidden="true" /><span className="hint-control-copy"><strong>Move</strong><small>Drag</small></span></span></span>
  </span>;
}
