import type { ReactNode } from "react";
import { aircraftSearchLink } from "../../lib/aircraft-search";

export default function AircraftTypeLink({ code, model, children }: { code?: string | null; model?: string | null; children?: ReactNode }) {
  const link = aircraftSearchLink(code, model);
  if (!link) return <>{children}</>;
  return <a className="aircraft-type-link" href={link.url} target="_blank" rel="noopener noreferrer" title={`Search Google for ${link.name}${code && code !== link.name ? ` (${code})` : ""} aircraft information and images (opens in a new tab)`}>
    {children}<span className="sr-only"> (search aircraft information and images on Google, opens in a new tab)</span>
  </a>;
}
