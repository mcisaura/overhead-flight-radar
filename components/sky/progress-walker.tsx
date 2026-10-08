type ProgressWalkerProps = {
  progress: number;
  pointing: boolean;
  paused: boolean;
  returning: boolean;
  animationPaused?: boolean;
};

// A small bitmap alphabet keeps the dialogue in the same pixel style as the pilot.
const cueGlyphs = [
  ["10000", "10000", "10000", "10000", "10000", "10000", "11111"], // L
  ["00000", "00000", "01110", "10001", "10001", "10001", "01110"], // o
  ["00000", "00000", "01110", "10001", "10001", "10001", "01110"], // o
  ["10000", "10000", "10010", "10100", "11000", "10100", "10010"], // k
  ["00000", "00000", "10001", "10001", "10001", "10011", "01101"], // u
  ["00000", "00000", "11110", "10001", "11110", "10000", "10000"], // p
];
const cuePixels = cueGlyphs.flatMap((rows, glyph) => rows.flatMap((row, y) =>
  [...row].flatMap((pixel, x) => pixel === "1" ? [`M${glyph * 6 + (glyph > 3 ? 4 : 0) + x} ${y}h1v1h-1z`] : [])
)).join("");

export default function ProgressWalker({ progress, pointing, paused, returning, animationPaused = false }: ProgressWalkerProps) {
  return <span className={`pixel-walker${pointing ? " is-pointing" : ""}${paused ? " is-paused" : ""}${returning ? " is-returning" : ""}${animationPaused ? " is-animation-paused" : ""}`} style={{ left: `clamp(15px, ${Math.max(0, Math.min(100, progress))}%, calc(100% - 15px))` }} aria-hidden="true">
    <svg className="pilot-sprite" viewBox="0 0 24 32" width="36" height="48" shapeRendering="crispEdges" focusable="false">
      <g className="pilot-upper-body">
        {/* Navy cap, gold band and badge, with a projecting visor. */}
        <path fill="#243642" d="M9 1h7v1h2v4h2v1H8V6H7V2h2z" />
        <path fill="#4b5f6c" d="M9 2h7v1h1v2H8V3h1z" />
        <path fill="#c5a261" d="M7 4h11v2H7z" />
        {/* Profile, ear, eye and neck. */}
        <path fill="#c78d66" d="M9 7h7v2h2v2h-2v2h-2v2h-3v-2H9z" />
        <path fill="#ebbb8f" d="M11 7h5v2h2v1h-3v2h-4z" />
        <rect x="9" y="9" width="1" height="2" fill="#966348" />
        <rect x="14" y="8" width="1" height="1" fill="#17222a" />
        <rect x="14" y="12" width="2" height="1" fill="#966348" />
        {/* A clear shirt and broad gold shoulder bars carry the uniform at small sizes. */}
        <path fill="#243642" d="M8 15h9v1h1v7h-2v1H9v-1H7v-7h1z" />
        <path fill="#4b5f6c" d="M8 17h2v5H8zM15 17h2v5h-2z" />
        <path fill="#fff8ee" d="M10 15h5v2h-1v4h-3v-4h-1z" />
        <path fill="#243642" d="M12 16h1v1h1v3h-2z" />
        <path fill="#c5a261" d="M7 15h3v2H7zM15 15h3v2h-3z" />
        <rect x="9" y="23" width="7" height="1" fill="#17222a" />
        <g className="pilot-arms pilot-stride-a">
          <path fill="#243642" d="M7 17h2v4H7v2H5v-3h2zM17 17h2v3h1v2h-2v-2h-1z" />
          <path fill="#ebbb8f" d="M5 23h2v2H5zM18 22h2v2h-2z" />
        </g>
        <g className="pilot-arms pilot-stride-b">
          <path fill="#243642" d="M6 17h2v6H6zM17 17h2v6h-2z" />
          <path fill="#ebbb8f" d="M6 23h2v2H6zM17 23h2v2h-2z" />
        </g>
        <g className="pilot-arms pilot-stride-c">
          <path fill="#243642" d="M7 17h2v3H7v2H5v-3h2zM17 17h2v4h1v2h-2v-2h-1z" />
          <path fill="#ebbb8f" d="M5 22h2v2H5zM18 23h2v2h-2z" />
        </g>
        <g className="pilot-arms pilot-stride-d">
          <path fill="#243642" d="M7 17h2v6H7zM16 17h2v6h-2z" />
          <path fill="#ebbb8f" d="M7 23h2v2H7zM16 23h2v2h-2z" />
        </g>
        <g className="pilot-rest-arms">
          <path fill="#243642" d="M6 17h2v7H6zM17 17h2v7h-2z" />
          <path fill="#ebbb8f" d="M6 24h2v2H6zM17 24h2v2h-2z" />
        </g>
        <g className="pilot-point-arm">
          <path fill="#243642" d="M6 17h2v7H6zM17 16h3v2h-3zM19 14h3v3h-3zM21 10h2v5h-2z" />
          <path fill="#ebbb8f" d="M6 24h2v2H6zM21 7h3v3h-3zM20 8h1v2h-1zM22 2h1v6h-1z" />
        </g>
      </g>
      {/* Four contact/passing poses keep footfalls evenly spaced. */}
      <g className="pilot-legs pilot-stride-a">
        <path fill="#243642" d="M9 24h3v3h-1v3H8v-3h1zM13 24h3v3h1v3h-3v-3h-1z" />
        <path fill="#4b5f6c" d="M14 27h1v3h-1z" />
        <path fill="#17222a" d="M6 30h5v1H6zM14 30h6v1h-6z" />
      </g>
      <g className="pilot-legs pilot-stride-b">
        <path fill="#243642" d="M9 24h3v6H9zM13 24h3v3h-2v2h-2v-2h1z" />
        <path fill="#17222a" d="M8 30h5v1H8zM12 29h4v1h-4z" />
      </g>
      <g className="pilot-legs pilot-stride-c">
        <path fill="#243642" d="M9 24h3v3h1v3h-3v-3H9zM13 24h3v3h2v3h-3v-3h-2z" />
        <path fill="#4b5f6c" d="M10 27h1v3h-1z" />
        <path fill="#17222a" d="M8 30h5v1H8zM15 30h6v1h-6z" />
      </g>
      <g className="pilot-legs pilot-stride-d">
        <path fill="#243642" d="M9 24h3v3h1v2h-3v-2H9zM13 24h3v6h-3z" />
        <path fill="#17222a" d="M9 29h5v1H9zM13 30h5v1h-5z" />
      </g>
      <g className="pilot-still-legs">
        <path fill="#243642" d="M9 24h3v6H9zM13 24h3v6h-3z" />
        <path fill="#17222a" d="M8 30h4v1H8zM13 30h5v1h-5z" />
      </g>
    </svg>
    <span className="walker-dialog">
      <svg className="walker-dialog-text" viewBox="0 0 39 7" width="58.5" height="10.5" shapeRendering="crispEdges" focusable="false">
        <title>Look up</title>
        <path d={cuePixels} fill="currentColor" />
      </svg>
    </span>
  </span>;
}
