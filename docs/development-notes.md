# Development notes

Overhead is a personal React/vinext app with Live aircraft data and three fictional Houston Demo flights. See the README for setup, structure, and credits.

## Working here

- The app repository is `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only. Leave `../unused-assets/` outside the repository.
- Run `npm run check` to test, type-check, lint, and build. The suite currently has 66 tests. Existing warnings concern an airline logo `<img>` and the separate large 3D bundle.
- Prefer `/?mode=demo` for browser testing. Every uncached Live AirLabs request spends part of the shared 900-call rolling 31-day budget; there is no periodic polling.
- The real AirLabs key is in ignored `.env.local`. Never print it, commit it, or overwrite an existing configured key.

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
- Demo Pause stops walking and body bob while retaining the pointing cue. Reduced motion also disables movement transitions and the animated drop. Live remains a non-interactive progress indicator with its existing midpoint hold and return path.

## Local verification

- The full project check passed all 66 tests, type checks, lint, and production build for the final pilot changes, including walking while pointing. The existing airline-image and large-bundle warnings remain.
- Pilot walking, pointing, and idle artwork was rendered separately and visually inspected.
- Full browser animation and interaction verification remains pending: browser access was blocked because the browser security check was unavailable. The hosting verification below predates these local pilot changes.

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
