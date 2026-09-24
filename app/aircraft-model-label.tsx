import { splitAircraftDescription } from "../lib/flight-display";

export default function AircraftModelLabel({ label }: { label: string }) {
  const { model, details } = splitAircraftDescription(label);
  return <>{model}{details && <> <em>{details}</em></>}</>;
}
