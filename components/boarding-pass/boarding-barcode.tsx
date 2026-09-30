// Code 128-B for OVERHEAD: start 104, data 47/54/37/50/40/37/33/36,
// weighted checksum 69, stop 106. This is denser than Code 39 at small sizes.
const symbols = ["211214", "133121", "311123", "132113", "231131", "231113", "132113", "111323", "112313", "112214", "2331112"];
const height = 24;
let cursor = 10; // Ten-module quiet zones on both ends.
const bars = symbols.flatMap((pattern) => {
  const result: { x: number; width: number }[] = [];
  for (let element = 0; element < pattern.length; element++) {
    const width = Number(pattern[element]);
    if (element % 2 === 0) result.push({ x: cursor, width });
    cursor += width;
  }
  return result;
});
const width = cursor + 10;

export default function BoardingBarcode() {
  return <div className="boarding-barcode">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" shapeRendering="crispEdges" role="img" aria-label="Barcode encoding OVERHEAD">
      <rect width={width} height={height} fill="#fffefb" />
      {bars.map((bar) => <rect key={bar.x} x={bar.x} width={bar.width} height={height} fill="#14252d" />)}
    </svg>
  </div>;
}
