import { ChevronDown } from "lucide-react";
import type { LocationIssue } from "../../lib/location-access";

const messages: Record<LocationIssue, string> = {
  blocked: "Location access is blocked.",
  unavailable: "We couldn’t find your location. Check that location services are enabled.",
  timeout: "Finding your location took too long.",
  unsupported: "This browser doesn’t support location access.",
  unknown: "We couldn’t access your location.",
};

export default function LocationFeedback({ issue, onRetry }: { issue: LocationIssue; onRetry: () => void }) {
  const canRetry = issue === "unavailable" || issue === "timeout" || issue === "unknown";
  return <div className="location-feedback">
    <div className="location-feedback-line">
      <p role="status">{messages[issue]}</p>
      {canRetry && <button type="button" className="location-feedback-retry" onClick={onRetry}>Try again</button>}
    </div>
    {issue === "blocked" && <details className="location-permission-help">
      <summary>How to allow location <ChevronDown size={12} aria-hidden="true" /></summary>
      <ol>
        <li>Open this site’s permissions in your browser, usually beside the address bar, and allow location access.</li>
        <li>If access is still blocked, check location services and your browser’s location permission in your device settings.</li>
        <li>Return here and choose <b>Use my location</b> again.</li>
      </ol>
    </details>}
    {issue === "unsupported" && <p className="location-feedback-note">Try a browser with location support.</p>}
    <p className="location-feedback-note">Your current sky stays selected.</p>
  </div>;
}
