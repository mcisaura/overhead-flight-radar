import { ChevronDown } from "lucide-react";
import type { LocationIssue } from "../../lib/location-access";

type BrowserIdentity = { userAgent: string; platform?: string; maxTouchPoints?: number };

export function usesIosSafariLocationHelp(browser?: BrowserIdentity) {
  if (!browser) return false;
  const appleMobile = /iPhone|iPad|iPod/.test(browser.userAgent)
    || (browser.platform === "MacIntel" && (browser.maxTouchPoints ?? 0) > 1);
  return appleMobile && /Safari\//.test(browser.userAgent)
    && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(browser.userAgent);
}

const messages: Record<LocationIssue, string> = {
  blocked: "Your browser or device hasn’t allowed location access.",
  unavailable: "We couldn’t find your location. Check that location services are enabled.",
  timeout: "Finding your location took too long.",
  unsupported: "This browser doesn’t support location access.",
  "out-of-range": "Your location is outside this map’s supported area.",
  unknown: "We couldn’t access your location.",
};

export default function LocationFeedback({ issue, onRetry, onChooseLocation }: { issue: LocationIssue; onRetry: () => void; onChooseLocation?: () => void }) {
  const iosSafari = usesIosSafariLocationHelp(typeof navigator === "undefined" ? undefined : navigator);
  const canRetry = issue === "blocked" || issue === "unavailable" || issue === "timeout" || issue === "unknown";
  return <div className="location-feedback">
    <div className="location-feedback-line">
      <p role="status">{messages[issue]}</p>
      {canRetry && <button type="button" className="location-feedback-retry" onClick={onRetry}>{issue === "blocked" ? "Check again" : "Try again"}</button>}
    </div>
    {issue === "blocked" && <>
      <p className="location-feedback-note">{iosSafari ? "Safari may not show the prompt again after access was denied. Update its permissions, then check again." : "A blocked permission prompt can’t be reopened by this site. Update your browser or device permissions, then check again."}</p>
      <details className="location-permission-help" open={iosSafari}>
        <summary>{iosSafari ? "Allow location on iPhone or iPad" : "How to allow location"} <ChevronDown size={12} aria-hidden="true" /></summary>
        {iosSafari ? <ol>
          <li>In Safari’s address bar, open the <b>Page Menu</b>, then <b>Website Settings</b> (or <b>More</b>). Set <b>Location</b> to <b>Ask</b> or <b>Allow</b>.</li>
          <li>In the iPhone or iPad <b>Settings</b> app, open <b>Privacy &amp; Security → Location Services</b>. Turn Location Services on, then select <b>Safari Websites → While Using the App</b>.</li>
          <li>Return here and tap <b>Check again</b>. If Safari asks, allow location access.</li>
        </ol> : <ol>
          <li>Open this site’s permissions in your browser, usually beside the address bar, and allow location access.</li>
          <li>If access is still blocked, check location services and your browser’s location permission in your device settings.</li>
          <li>Return here and choose <b>Check again</b>.</li>
        </ol>}
      </details>
    </>}
    {issue === "unsupported" && <p className="location-feedback-note">Try a browser with location support.</p>}
    {issue === "out-of-range" && <p className="location-feedback-note">Choose a location between 85° south and 85° north using the arrow beside Use my location.</p>}
    {onChooseLocation && <button type="button" className="location-feedback-map" onClick={onChooseLocation} aria-haspopup="dialog" aria-controls="sky-zone-panel">Choose on the map instead</button>}
    <p className="location-feedback-note">Your current sky stays selected.</p>
  </div>;
}
