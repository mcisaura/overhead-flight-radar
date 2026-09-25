type ProgressWalkerProps = {
  progress: number;
  pointing: boolean;
};

export default function ProgressWalker({ progress, pointing }: ProgressWalkerProps) {
  return <span className={`pixel-walker ${pointing ? "is-pointing" : ""}`} style={{ left: `clamp(15px, ${Math.max(0, Math.min(100, progress))}%, calc(100% - 15px))` }} aria-hidden="true">
    <svg viewBox="0 0 16 24" width="24" height="36" shapeRendering="crispEdges" focusable="false">
      <rect x="6" y="1" width="4" height="1" />
      <rect x="5" y="2" width="6" height="5" />
      <rect x="6" y="7" width="4" height="1" />
      <rect x="7" y="8" width="2" height="8" />
      <g className="walker-stride-a">
        <rect x="4" y="9" width="2" height="2" /><rect x="3" y="11" width="2" height="3" />
        <rect x="10" y="9" width="2" height="2" /><rect x="11" y="11" width="2" height="3" />
        <rect x="5" y="16" width="2" height="3" /><rect x="3" y="19" width="2" height="3" /><rect x="2" y="22" width="4" height="1" />
        <rect x="9" y="16" width="2" height="3" /><rect x="11" y="19" width="2" height="3" /><rect x="11" y="22" width="4" height="1" />
      </g>
      <g className="walker-stride-b">
        <rect x="4" y="9" width="2" height="3" /><rect x="5" y="12" width="2" height="2" />
        <rect x="10" y="9" width="2" height="3" /><rect x="9" y="12" width="2" height="2" />
        <rect x="6" y="16" width="2" height="4" /><rect x="5" y="20" width="2" height="3" /><rect x="4" y="22" width="4" height="1" />
        <rect x="8" y="16" width="2" height="4" /><rect x="9" y="20" width="2" height="3" /><rect x="8" y="22" width="4" height="1" />
      </g>
      <g className="walker-point">
        <rect x="4" y="9" width="2" height="4" /><rect x="3" y="13" width="2" height="2" />
        <rect x="10" y="9" width="2" height="2" /><rect x="12" y="7" width="2" height="3" /><rect x="13" y="4" width="2" height="3" /><rect x="13" y="2" width="1" height="2" />
        <rect x="6" y="16" width="2" height="7" /><rect x="4" y="22" width="4" height="1" />
        <rect x="8" y="16" width="2" height="7" /><rect x="8" y="22" width="4" height="1" />
      </g>
    </svg>
  </span>;
}
