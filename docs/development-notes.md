# Development notes

Overhead is a personal React/vinext app with Live aircraft data and three fictional Demo presets that can cross a selected location. See the README for setup, structure, and credits.

## Working here

- The app repository is `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only. Leave `../unused-assets/` outside the repository.
- Run `npm run check` to test, type-check, lint, and build. The suite currently has 83 tests. Existing warnings concern an airline logo `<img>` and the separate large 3D bundle.
- Prefer `/?mode=demo` for browser testing. Every uncached Live AirLabs request spends part of the shared 900-call rolling 31-day budget; there is no periodic polling.
- The real AirLabs key is in ignored `.env.local`. Never print it, commit it, or overwrite an existing configured key.

## Location and zone controls (12 November 2026)

- `app/page.tsx` owns the shared location and radius. They survive mode switches for the session, but are not persisted across reloads. Live retains the GPS/manual split button; Demo has only a manual picker button.
- `components/controls/sky-zone-settings.tsx` provides the shared native dialog. Its map comes first, search and radius follow, and only the body scrolls so heading and Apply/Cancel controls remain visible on phones.
- `components/map/zone-location-map.tsx` keeps the marker and zone centered during every map move. It publishes settled coordinates to React, preserves center on resize and zoom while panning, and exposes the current center to Apply so inertial motion cannot save a stale draft.
- `lib/location-search.ts` debounces city/postcode input by 300 ms after two characters. Enter flushes the delay. New queries, clearing, selecting, and unmounting cancel obsolete requests; a generation check also rejects stale responses when a fetch ignores abort. Open-Meteo geocoding is requested directly by the browser, with an eight-second timeout, and does not spend the AirLabs allowance.
- `lib/map-location.ts` defines the UI map boundary of ±85° latitude and longitude wrapping. Search, picker, GPS validation, and Demo relocation use that boundary. Unsupported selections produce feedback; direct `/api/sky` coordinate validation retains its existing ±90° latitude contract.
- Live sends `radiusNm` to `/api/sky`; omission defaults to 5. The API accepts whole numbers from 1 through 25, expands upstream bounds accordingly, and uses the chosen radius for aircraft filtering and zone progress. Client-side selection, handoff/exit checks, and map presentation use the same radius.
- `demoAircraftAtLocation` relocates each preset while retaining its heading and relative closest pass. Custom locations use local direction labels rather than Houston airport endpoints. The picker pauses simulation time while open; exiting a flight also waits until the picker closes. Demo never invokes geolocation.
- The Live picker cancels any pending GPS callback before opening. Permission denial keeps the existing sky, provides an explicit Check again action and manual map fallback, and expands recovery steps in iPhone/iPad Safari. The native permission request remains directly initiated by the user’s click.

## Current verification (12 November 2026)

- `npm run check` passes all 83 tests, TypeScript, ESLint, and the production build. Existing airline-image and large-3D-bundle warnings remain.
- Three subagents reviewed picker behavior, Demo geometry, and Live/API consistency. QA fixed pending-GPS/picker races, stale Apply during inertial panning, and invalid polar selections; resize behavior was hardened.
- Browser checks covered desktop, 390 × 844 and 320 × 640 phone viewports, light/dark appearance, search-as-you-type, latest-query replacement, suggestion keyboard navigation, clear/Escape, selected-location Apply, map panning/zoom, radius limits, cancel/focus recovery, mode switching, and Demo pause/resume.
- Simulated geocoding failure displayed recovery feedback and a retry succeeded. The browser extension also emitted an `activeContentBlocker.js` rejection during that deliberate failure; the app’s request was caught. No global error suppression was added.
- GPS permission denial/retry and iOS recovery content are covered by fake-GPS and rendering tests. Native Safari permission behavior still needs a physical-iPhone smoke test after deployment. Responsive Chrome screenshots do not constitute native iPhone verification.
- Demo geometry was additionally swept across 3,618 positions at supported polar/dateline boundaries. Local screenshots and the detailed QA report are generated artifacts under ignored `outputs/`; they are not deployed assets.

## Deployment baseline (6 October 2026)

- GitHub `mcisaura/overhead-flight-radar`, branch `main`, is the source of truth. Fetch and reconcile it before making local changes. Preserve uncommitted work; do not overwrite GitHub with a stale copy.
- Cloudflare Worker: `overhead-flight-radar` in the owner’s account. GitHub pushes to `main` run checks and deploy automatically; preview builds are disabled.
- Worker secrets hold the shared AirLabs key. Keep it out of build variables. Application error logs are enabled; request URL logs and automatic traces are disabled to avoid recording locations or the upstream key.
- README and these notes are now concise; older session logs and the resolved September code review remain available in Git history.
- Removed unused font/aircraft assets, the obsolete `/preview/mode-toggle` route, and the toggle wrapper. The main Live/Demo toggle keeps its existing markup and styles.
- One GitHub workflow runs `npm run check` on pushes to `main`, or manually. Keep the existing local regression tests.
- After this cleanup, all 66 tests, type checks, lint, and production build pass with the existing warnings. The toggle markup is identical to its previous implementation.
- Keep the supplied fonts and do not add a code license, per the owner’s preference. The supplied Frutiger files have no accompanying license file; redistribution rights have not been independently verified.

## Pilot progress character (8 October 2026, local changes)

- The pixel pilot is drawn directly in SVG in `components/sky/progress-walker.tsx`, with a navy cap and uniform, white shirt, tie, broad gold epaulettes, and a gold cap band. The character and dialogue use custom SVG artwork.
- The character renders at 36 × 48 px, with the larger 56 × 72 px drag area retained. `app/globals.css` cycles four walking poses over 800 ms with a subtle torso bob. The raised pointing arm is separated from the cap, with a pixel “Look up” bubble during the 40–60% overhead cue. The walking legs and torso bob continue while pointing during Demo playback.
- `components/sky/draggable-progress-walker.tsx` places the Demo control in a transform wrapper with 15 px track insets. The existing 50 ms position updates are interpolated with a 70 ms linear transform transition; the lifted character follows the pointer directly. This keeps the map and ticket on their existing update schedule.
- Scrubbing pauses playback and preserves the selected elapsed time for Resume. Arrow keys change progress by 1%, Shift increases the step to 10%, and Home/End select the endpoints. `lib/walker-drag.ts` uses the same track insets and 72 px handle height for lift-and-drop landing calculations.
- Demo Pause freezes the leg cycle and body bob together while retaining the pointing cue; Resume continues their animation phases. Reduced motion also disables movement transitions and the animated drop. Live remains a non-interactive progress indicator with its existing midpoint hold and return path.

## Earlier pilot verification (8 October 2026)

- The full project check passed all 66 tests, type checks, lint, and production build for the final pilot changes, including walking while pointing. The existing airline-image and large-bundle warnings remain.
- Pilot walking, pointing, and idle artwork was rendered separately and visually inspected.
- At that time, browser animation and interaction verification was pending because browser access was unavailable. The current verification section above supersedes that limitation for the local feature checks; the hosting verification below remains historical.

## Hosting verification (6 October 2026)

- The hosted Live and Demo endpoints returned 200 with weather and no warnings. Cloudflare confirms the Worker secret, rate-limit bindings, and `AirLabsBudget` namespace.
- Desktop browser verification covered Demo aircraft rendering, map loading, playback/pause, and switching to Live. Phone-width verification remains optional.
- The owner confirmed AirLabs allowance on 6 October 2026. The shared budget cannot include earlier usage or other apps on the account.

## Owner’s Git conventions

- Author and committer: `mcisaura <sankarpete@gmail.com>`.
- Code commits: no `Co-authored-by` or other AI attribution. Disable the tool’s default commit attribution.
- Keep README/docs changes in separate docs-only commits, with `Co-authored-by: Codex <noreply@openai.com>` or `Co-authored-by: Claude <noreply@anthropic.com>`, matching the tool making the change. Use `docs: <topic>` messages.
- The owner writes commit messages. Ask for one or propose a short lowercase message in their style.
- Do not push, add a remote, or rewrite history without the owner’s authorization. The September history was rebuilt and must not be rewritten again without asking.
