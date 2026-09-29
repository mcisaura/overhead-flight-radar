# Overhead

Overhead shows aircraft currently reported within 5 nautical miles of a chosen location. Live mode opens on downtown Houston, labeled as a reference location. Select **Use my location** to see the sky near you. The header contains the Live/Demo toggle, light/dark theme toggle, selected place, and a compact weather strip. Demo has three fictional Houston flights and sample weather.

The project was inspired by British Airways' 2013 **#LookUp** campaign, which connected planes in the sky to information shown on a billboard.

For a new chat or work session, start with [HANDOFF.md](HANDOFF.md). It records the current state, verification, and the next issue to check.

## Live and Demo at a glance

| | Live | Demo |
| --- | --- | --- |
| Aircraft | Flights reported by AirLabs within 5 nautical miles of the selected location. The closest eligible aircraft is featured, and another takes over if it becomes closer. | Three preplanned fictional flights near downtown Houston: an airliner, a private plane, and a helicopter. |
| Movement | Estimated between 30-second reports from the last known position, heading, and speed. A new report can correct the displayed position. | A planned crossing lasting 30 seconds per flight, with altitude and speed changing along the route. |
| Weather | Current conditions from Open-Meteo for the selected location. | Labeled sample conditions stored with the app. |
| Controls | **Use my location** and **Refresh**. A next-closest aircraft appears when one is available. | Choose a flight, pause or resume, scrub its position, replay, reset to entry, or clear the sky. |
| Flight details | Reported information, which may be delayed or incomplete; closest-pass and exit estimates appear when they can be calculated. | Consistent details prepared for each fictional scenario. |

Both modes use the same boarding-pass presentation, map, 3D aircraft interactions, quiet-sky clouds, and weather-unit toggle. The 3D models represent broad aircraft categories and may not match a live flight's exact aircraft type. Demo does not request live aircraft or weather data, though its map still loads OpenStreetMap tiles.

## Appearance

The header's sun/moon toggle switches both Live and Demo between light and dark modes. The choice carries across the two modes while the page remains open; a full refresh starts in light mode again. It is not saved to browser storage or based on the device theme. Dark mode adjusts the sky, boarding pass and split-flap display, flight cards, map controls and tiles, and footer. On narrow screens the theme toggle shows only its icon, with an accessible label.

The footer's **Hero background** selector provides direct access to the original photographic sky, a warm Houston skyline concept, and a low-poly illustrated sky. The choice is shared between Live and Demo for the current page session. The two alternate images are bottom-centered so their skyline and horizon edges remain visible across desktop and mobile crops.

All project attribution remains visible in the footer. It is organized into compact **Data & maps** and **3D assets** groups covering AirLabs, Open-Meteo, OpenStreetMap, Leaflet, Three.js, and each model creator and license.

## Run locally

Requires Node.js 22.13 or newer and npm:

```bash
npm ci
npm run dev
```

For Live mode, create `.env.local` with `AIRLABS_API_KEY=your_key` only if it does not already exist; do not overwrite a configured key. Open `http://localhost:5173/` for the app. Live data requires internet access. Stop the development server with `Ctrl+C`. To verify the project:

```bash
npx tsc --noEmit
npm test
npm run lint
npm run build
```

## Live data

- **AirLabs:** nearby aircraft positions and their reported origin and destination, refreshed through the app every 30 seconds. The server searches beyond the five-nautical-mile zone to include aircraft that may have moved into it since their last report, then filters by estimated position. It caches each area query for 30 seconds and airport, airline, and fleet lookups for one day. Airport enrichment is limited to the eight nearest aircraft, with at most four metadata calls running and 32 waiting per worker instance. Overloaded or unavailable metadata falls back to an unverified route. Airline names and aircraft models come from AirLabs where available; common codes have local fallbacks. The selected airline's logo uses AirLabs' logo URL, and known airlines get brand color badges. Missing logos fall back to initials; unknown airlines use a neutral color. Hover or focus a flight name or aircraft model to see its raw code. The API key stays on the server in `.env.local` as `AIRLABS_API_KEY`. Missing altitude or route details are shown as unavailable.
- The live endpoint limits requests to 12 per client and 120 per minute per running instance. Cloudflare rate-limit bindings enforce the same limits per Cloudflare location in deployment; [Cloudflare documents that these counters are local to each location](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#locality). These limits reduce abuse but are not a global account-wide AirLabs quota cap. Before public hosting, add an account-wide quota guard and verify it against the deployed Worker, then monitor AirLabs usage and quota failures. The server logs endpoint, status, and failure class without the API key or precise requested location.
- Reported routes are checked against the aircraft's estimated position only when both airport coordinates are available. Failed lookups and routes outside the enrichment cap remain unverified; implausible routes are withheld as inconsistent. Neither state is presented as a verified route.
- In `GET /api/sky`, each aircraft's `lat` and `lon`, distance, and zone progress refer to the same estimated display position. `reportedPosition` preserves the source coordinates for continued projection between polls.
- **Open-Meteo:** current weather, cached for ten minutes.
- **OpenStreetMap:** map tiles, with attribution on the map.

The Live flight details sidebar has a Flight Brief when an aircraft is tracked. It shows reported route endpoints when available, plus heading, projected closest pass, and estimated time to leave the observation zone. Missing projections show a dash instead of a guessed value.

The map uses pale, filtered OpenStreetMap raster tiles with projected flight lines. It loads when it nears the viewport. Live markers and route endpoints use the same estimated coordinates, and existing Leaflet paths are moved in place rather than destroyed and redrawn, keeping the line smoothly attached to the aircraft. On desktop, the map and flight details card start together and have matching 500px minimum heights; on smaller screens they stack. The map controls and key sit inside the map, with no separate chart heading above it. For live flights, airport coordinates are looked up from AirLabs for the eight nearest aircraft, with at most 16 unique airport lookups, then cached for one day. A solid line links a known departure airport to the aircraft and a dashed line projects onward to a known arrival airport; neither line is a recorded flight track. When both airport coordinates are available, **Full route** zooms out to show the endpoints. Otherwise the map shows a short heading projection in **Local sky** view. Demo routes use approximate airport coordinates and are illustrative.

The hero aircraft is a generic 3D illustration rendered with Three.js in React. Commercial aircraft use the supplied Boeing 737-200 model, private and small fixed-wing aircraft use the Cessna 310, and helicopters and similar rotorcraft use the helicopter model. AirLabs' aircraft type code and model name determine the category; an airline identity helps identify commercial flights when the type is ambiguous. These models are visual stand-ins, while the boarding pass keeps each flight's reported type. Left-click drag the aircraft to move it temporarily, or right-click drag to rotate it; it returns to the moving flight path on release. The renderer pauses when the scene is offscreen or the tab is hidden, then catches up to the current flight position when visible again. The live hero shows the closest eligible aircraft in the 5-nautical-mile zone, using estimated positions between reports. Another aircraft takes over when it becomes closer; if the zone is empty, the quiet-sky pass appears. Selecting a map marker previews that aircraft on the map without changing the hero. Reported positions can be delayed or missing. Live mode does not request browser location until the user selects **Use my location**. If location is unavailable, downtown Houston remains the reference location.

The aircraft and cloud scene code loads when its scene is needed. Each aircraft model file loads on demand; parsed scenes are reused, and replaying the same Demo flight keeps its WebGL renderer. The quiet-sky cloud model is loaded when needed; its three copies gently bob and tilt at different rates, pausing offscreen, in a hidden tab, or when reduced motion is requested. Each cloud can be left-click dragged across the full hero or right-click dragged to rotate it, then eases back to its idle position on release. The drag range keeps the cloud visible at the hero's edges. A dragged cloud passes in front of the boarding pass until it returns. The chosen Live location is kept when switching between Live and Demo during the current page session.

The live flight feed no longer calls ADSB.fi or ADSBdb.

## Demo

The Demo contains three preplanned fictional flights over downtown Houston: an arrival bound for George Bush Intercontinental Airport, a private plane crossing north of the observation point, and a low-level helicopter patrol passing close to it. The airliner has an illustrative airport route; the local flights have zone entry and exit directions but no invented airport endpoints. Positions follow a straight track with altitude and speed interpolated through entry, closest approach, and exit; playback movement follows the changing speed. Each on-screen crossing lasts 30 seconds of real elapsed playback time, including time spent in a hidden tab. Pause and scrub stop that clock until playback resumes. Select a preset to watch, pause, resume, replay, or scrub its position. The boarding pass heading changes from “Drawing closer” to “Heading away” as the sample aircraft crosses the zone. Demo flights and weather are local fixtures; switching to Demo does not request live flight or weather data. Map tiles still come from OpenStreetMap.

## Boarding pass

The hero uses a boarding pass card in both its quiet and active states. The pass keeps the same top-left position across states and flight scenarios. The dark headline panel sits at the top and uses self-hosted Barlow Condensed lettering inspired by split-flap displays. Its upper and lower halves flip when the headline changes. One short fade accompanies broader content changes, while reduced-motion preferences make these changes immediate. With no flight, the card reads “A quiet sky. For now.” and its stub shows the observation zone and relevant controls behind a dense ticket-style perforation line with outlined side cutouts. A small Three.js scene places three copies of the supplied low-poly cloud model behind the pass; the scene gives way to the aircraft when a flight appears. When a flight is present, the pass shows the reported airline and aircraft, origin and destination. Its stub keeps three identifier positions for the IATA flight code, a distinct ICAO callsign when available, and the aircraft type code, using a dash for missing values. Below a divider, larger altitude, ground speed, and distance values appear with the relevant controls: **Use my location** and **Refresh** in Live mode, or playback controls in Demo. The full model name remains at the top. Aircraft details such as winglets appear in italics after the base model name. Hover or focus the flight name and aircraft model to see their raw codes. Live details also show the age of the last report and whether the displayed position is estimated. On screens 520px wide or narrower, active passes use a compact layout, clamp long airport names to two lines, and condense the next-aircraft queue so variable live content cannot stretch the hero far below the viewport. The card does not invent a seat, gate, or departure time when these are not confirmed by the data source.

## Weather in the header

The weather readout sits in the main header row between the logo and mode controls. Live mode shows current temperature, conditions, cloud cover, and wind from Open-Meteo. Demo shows clearly labeled sample conditions. A footer toggle switches weather temperature between °F and °C and wind between mph and km/h; the choice carries across Live and Demo while the page is open. At narrower widths, the header hides the secondary weather details and places the mode and location controls on a second row within the header.

## Motion and progress

Demo flights have accelerated playback controls. While the page is visible, Live mode estimates map positions and crossing progress at a throttled 30 frames per second between 30-second AirLabs polls using the last reported position, heading, and ground speed. It checks the estimated positions for a closer aircraft between polls and refreshes the selection when one takes the lead. Aircraft without a reported heading can still be selected, but their position remains at the last report and crossing progress is unavailable. Progress follows the aircraft's projected crossing of the 5-nautical-mile circle, so an off-center pass can reach 100% when it leaves the circle; it does not need to fly directly overhead. The thin line at the bottom of the sky section shows crossing progress: a pixel figure walks from the start to the midpoint, points from 40% to 60%, stands still at the midpoint from 50% to 60%, then turns and walks back to the start as crossing progress reaches 100%. A small percentage sits at the right end.

Projection stops 90 seconds after the underlying report so it can continue throughout the 30-second polling interval even when the source position is already delayed; if heading or speed is missing, the position stays at the last report. These are straight-line estimates, not confirmed flight tracks: turns, climbs, speed changes, delayed reports, and coverage gaps can make the displayed position wrong. The marker and progress may shift when a new report corrects the estimate. The interface labels estimates in the flight details, and reduced-motion preferences turn off transitions.
Aircraft are removed from the active hero and map when their last report becomes more than 90 seconds old, even if polling fails. The Live API includes time spent fetching metadata in that age, so slow enrichment does not make a report appear newer. A successful poll can restore them.

## Main files

- `app/live-sky.tsx`: live header and weather, hero, polling, location choice, and details.
- `app/page.tsx`: mode toggle, Demo header and weather, and Demo experience.
- `app/theme-provider.tsx`, `app/theme-toggle.tsx`, `app/globals.css`: page-session theme state, header toggle, and light/dark styles.
- `app/boarding-pass-display.tsx`, `app/boarding-route.tsx`, `app/boarding-pass-extras.tsx`: boarding pass transitions, route, stats, and stub.
- `app/flight-identity.tsx`, `app/aircraft-model-label.tsx`, `lib/flight-display.ts`: readable flight and aircraft labels, codes, and airline presentation.
- `app/api/sky/route.ts`: server-side live API aggregation and caching.
- `app/flight-map.tsx`: interactive Leaflet map.
- `app/aircraft-model.tsx`, `lib/aircraft-visual.ts`: Three.js rendering and selection of the supplied aircraft models in Live and Demo.
- `app/hero-background-toggle.tsx`, `public/hero-houston-skyline.png`, `public/hero-low-poly-sky.png`: the footer background selector and its two alternate hero assets.
- `app/project-credits.tsx`: the always-visible footer attribution groups.
- `app/demo-data.ts`: Demo flights and weather.
- `app/flip-heading.tsx`: the boarding-pass split-flap headline used in Live and both demos.
- `lib/zone-progress.ts`, `lib/flight-estimate.ts`, `lib/closest-approach.ts`: crossing calculations, movement estimates, and closest-approach messages.
- `lib/route-plausibility.ts`: validation that suppresses clearly stale or mismatched reported airport pairs.

Before public hosting, review the source terms and request limits for [AirLabs](https://airlabs.co/docs/flights), [Open-Meteo](https://open-meteo.com/en/terms), and [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/). No deployment is configured here.

The Boeing 737-200 model is by LucasSS on Sketchfab, supplied as `boeing_737-200_white.glb` under the Sketchfab Standard License. See the attribution embedded in the GLB asset for its source URL.

The Cessna 310 model is by BorealRiver on [Sketchfab](https://sketchfab.com/3d-models/cessna-310-airplane-low-poly-bbf73d06537c4a2ba86b96a3b97209c1), supplied as `cessna_310_airplane_-_low_poly.glb` under CC BY 4.0. The helicopter model is by linus1178 on [Sketchfab](https://sketchfab.com/3d-models/helicopter-dec45a28e6f346648c3d6585426157b8), supplied as `helicopter.glb` under CC BY 4.0. Their GLB metadata also includes author, license, and source information.

The low-poly cloud model is by Hyungjung Kim on [Sketchfab](https://sketchfab.com/3d-models/low-poly-cloud-81910476b24d4fc5a73c908d6c2a38a2), supplied as `low_poly_cloud.glb` under CC BY-NC 4.0. Its author, license, and source are embedded in the GLB metadata and shown in the site footer.
