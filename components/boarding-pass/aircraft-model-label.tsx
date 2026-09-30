import AircraftTypeLink from "./aircraft-type-link";
import { splitAircraftDescription } from "../../lib/flight-display";

export default function AircraftModelLabel({ label, code }: { label: string; code?: string | null }) {
  const { model, details } = splitAircraftDescription(label);
  return <AircraftTypeLink code={code} model={model}>{model}{details && <> <em>{details}</em></>}</AircraftTypeLink>;
}
