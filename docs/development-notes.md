# Overhead development notes

Use this note when continuing the project in a new chat, with Codex or Claude. The app lives in `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only; work in `flight-overhead/`. `../unused-assets/` holds a spare low-poly airplane model; leave it.

## Start here (30 September 2026)

**What it is.** A Vite/vinext (Next-style) React app deployed as a Cloudflare Worker. Live mode shows aircraft within 5 nm using AirLabs plus Open-Meteo weather. Demo mode plays three fictional Houston flights. The hero is a boarding pass with a split-flap headline, 3D aircraft and clouds (Three.js), a Leaflet map, and dark mode. Distances are in nautical miles.

**Layout.** `app/` holds the page, layout, `globals.css`, and `api/sky/route.ts`. `components/` has `boarding-pass/`, `sky/`, `map/`, and `controls/`. `lib/` holds the logic, API contract, AirLabs budget, and Demo data. There are also `tests/`, `public/` (`fonts/`, `images/`, `models/`, `aircraft/`), `docs/`, and `worker.ts` (the Worker entry plus the AirLabs budget Durable Object).

**Commands.** `npm run dev` (http://localhost:5173), `npm test` (31 tests), `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run check` (runs all four). Expected warnings: one `<img>` lint warning in `components/boarding-pass/flight-identity.tsx`, and a large 3D-loader chunk warning at build.

**State.**
- Git: branch `main`, no remote, nothing pushed.
- Tests, types, lint, and a browser check pass after the 30 Sept folder reorganisation. The owner still needs to run `npm run check` once to confirm the production build.
- The AirLabs key lives only in `.env.local` (gitignored). Never print it, commit it, or put it in docs.
- Live is capped at 900 AirLabs calls per rolling 31 days, and every uncached call spends one. Avoid reloading Live repeatedly while testing; prefer Demo.

**Git history.** On 30 Sept the history was rebuilt from the Codex session logs so commits land on the days the work happened (Sept 22 onward). The owner wrote the commit messages. Documentation changes were then split into their own `docs:` commits, co-authored by the tool that wrote them. That history has been checked (every commit type-checks; no secrets) and must not be rewritten again without asking.

**Git rules (the owner's convention; follow exactly).**
- Author and committer: `mcisaura <sankarpete@gmail.com>`.
- Code commits: no `Co-authored-by` or other AI attribution. Turn off the tool's default attribution (Codex: `commit_attribution`; Claude Code: its attribution setting).
- Docs-only commits (`README.md`, `docs/`): add `Co-authored-by: Codex <noreply@openai.com>` or `Co-authored-by: Claude <noreply@anthropic.com>`, matching whichever tool made the change. Keep docs changes in their own commit, messaged `docs: <topic>`.
- The owner writes commit messages. Ask for one, or propose a short lowercase one in their style (e.g. `folder cleanups`).
- Don't push, add a remote, or rewrite history without asking.

**Open items.**
1. The owner runs `npm run check`, then creates the GitHub repo and pushes `main`. Their email must be verified on GitHub for the commits to count.
2. Before deploying Live publicly, follow README → “Repository and publishing”: check AirLabs usage, store `AIRLABS_API_KEY` as a Worker secret, and verify the rate limits and budget in the deployed Worker.
3. Optional: browser workflow tests (theme, geolocation denial, mode switching, Demo pause/scrub/replay); a README screenshot or GIF; the dark-mode boarding-pass stats panel is slightly lighter than the rest of the card.

## Current review work

The user wants to keep all functionality while making the project simpler and more efficient. `docs/code-review-2026-09-28.md` is the original review snapshot. On 29 September, F1–F7 received initial fixes and tests: local and Cloudflare per-location request limits, bounded metadata lookups, worker-wide concurrency and queue length, expanded date-line-safe search, stale-aircraft expiry, explicit route states, spatial fields based on the selected estimated position, real elapsed Demo playback, and structured upstream failure logs. A shared `lib/sky-contract.ts` now defines the live response. The initial page chunk fell from about 671 KB to about 59 KB after the 3D scenes were made lazy; the 3D loader remains a separate roughly 597 KB chunk. The build still warns about that chunk.

The user said this will be a public, low-traffic portfolio piece with a 1,000-call monthly AirLabs allowance. Live no longer polls every 30 seconds: it loads on entry, place change, manual Refresh, or aircraft handoff. The visible projection ends after 90 seconds and asks for Refresh. A shared Cloudflare Durable Object reserves a unit before each uncached AirLabs request and allows at most 900 calls in a rolling 31-day window; provider failures also spend a unit. A fake-key local Wrangler run confirmed the binding and persisted a reservation. The counter cannot include calls made before deployment or from other applications on the account, so check AirLabs usage before public deployment and monitor after. Remaining work: visually verify Live and Demo at desktop and mobile widths when browser access returns; add browser workflow coverage for theme, geolocation denial, mode switching, Demo pause/scrub/replay, and hidden-tab playback; validate the quota guard in the deployed Worker. The user explicitly approved F8 cleanup after automatic approval review initially rejected deletion. Unused starter UI components, database examples, auth helper, related files, and 24 direct package dependencies were removed; npm pruned 180 packages. On 29 September the remaining ChatGPT Sites template tooling was also removed (see Latest verification).

## Current product

- `/` has **Live** and a **Houston Demo**. Live defaults to downtown Houston and uses AirLabs flights near the selected location, Open-Meteo weather, and a five-nautical-mile observation zone. The nearest eligible aircraft is featured and can be replaced when another becomes closer.
- Houston Demo has three fictional flights (an IAH-bound commercial arrival, a west-to-east Cessna crossing, and a downtown helicopter patrol), each with a 30-second crossing, pause/resume, replay, scrub, and clear-sky controls.
- The former `/concept/houston` route was removed after its Houston scenarios were folded into the main Demo.
- Live AirLabs routes are checked against the aircraft position. Clearly mismatched airport pairs are removed from the boarding pass, map, and next-aircraft queue and labeled as inconsistent; the app never guesses replacement endpoints. This was added after AirLabs attached `ACK → BOS` to EJA206 while reporting that aircraft near Houston.
- The route guard was verified with the reproduced EJA206 position: `ACK → BOS` was rejected while a plausible `LAX → IAH` path was accepted. TypeScript, lint, and the production build pass; lint retains the existing `<img>` performance warning and the build retains the existing large-chunk warning.
- Cloud dragging and spring-back render at the browser animation-frame cadence, while undisturbed idle clouds retain their lower-power cadence. Tiny residual offsets snap to zero after they become visually imperceptible, preventing a long uneven tail at the end of the return.
- Live map route segments now use the same estimated aircraft coordinates as their markers and update the existing Leaflet paths in place. Live position interpolation runs at a throttled 30 fps while the page is visible, so the solid arrival and dashed departure lines remain attached to the moving plane without teardown flicker. A redundant second route-aircraft list was removed, and closest-aircraft selection uses a single pass instead of sorting twice per frame.
- A footer select menu lets the user directly choose the original photo, Houston skyline, or low-poly sky. The state lives in `app/page.tsx`, so the selected background carries between Live and Demo during the page session. Alternate image assets live in `public/images/hero-houston-skyline.png` and `public/images/hero-low-poly-sky.png`.
- The Houston skyline and low-poly variants are bottom-centered at `cover` size without the original background's extra scale transform. This preserves each alternate image's lower skyline/horizon edge across desktop and mobile crops.
- The boarding-pass stub seam uses a denser 4px/4px repeating perforation pattern with larger outlined side cutouts, making the tear edge more visually pronounced.
- Active boarding passes use a separate compact layout below 520px: the quiet-state minimum height is removed, heading/route spacing is reduced, long airport names are clamped to two lines, and the next-aircraft queue becomes a compact grid. The reproduced SWA3049 mobile case measured about 488px for the card and 794px for the complete hero at a 390×844 viewport, instead of the oversized card pushing the hero far below the fold.
- Both Live and Demo footers use `components/project-credits.tsx` to credit the project services and assets. Every attribution remains visible in two compact, muted, left-aligned groups: **Data & maps** for AirLabs, Open-Meteo, OpenStreetMap, and Leaflet; and **3D assets** for Three.js plus each aircraft/cloud model creator and applicable license.
- A sun/moon toggle in both headers switches the whole app between light and dark modes. The theme state lives in `components/controls/theme-provider.tsx`, starts light on every full page load, and carries between Live and Demo until refresh. It is not persisted. Dark styles in `app/globals.css` cover the sky, boarding pass and split-flap display, flight cards, map, controls, and footer. The latest CSS pass improved dark-mode contrast for Demo preset accents, boarding-pass labels, map key, progress line, and status text.
- All three views share the boarding pass, split-flap headline animation, 3D aircraft category models, drag/rotate interaction, map, quiet-sky clouds, and weather-unit control. The models are illustrations, not exact representations of every reported type.

## Latest verification

- Repository tidy-up on 30 September: components moved from `app/` into `components/` (`boarding-pass/`, `sky/`, `map/`, `controls/`), Demo data moved to `lib/demo-data.ts`, hero backgrounds moved to `public/images/`, and these notes and the code review moved into `docs/`. `app/` now holds only the page, layout, global styles, and API route. Local build output and template leftovers (`dist/`, `.next/`, `.wrangler/`, `.vinext/`, `.sites-runtime/`, the old review `.docx`) were deleted; they regenerate as needed. No behavior changed.
- Airline lookup fix on 29 September: `getAirline` in `app/api/sky/route.ts` used the IATA code before ICAO. IATA codes are reused, so callsign JTL218 (Jet Linx, IATA “JL”) was labelled “Japan Airlines” in the Live view. It now queries by ICAO when present and falls back to IATA. A new API test fails without the fix and passes with it; 31/31 tests, TypeScript, and lint pass.
- Visual pass on 29 September (latest): Live and Demo were reviewed in the in-app browser at 1440, 800, and 375px, light and dark, against the running dev server. Fixes made and re-verified in the browser:
  - Demo sidebar values are rounded (previously showed e.g. `3,885.25 ft`, `192.436 kt`).
  - All distances are nautical miles via `formatDistanceNm` in `lib/flight-display.ts` (new test in `tests/flight-display.test.ts`).
  - Map card omits the stat row for the tracked aircraft (kept for a different selected aircraft), has no fixed minimum height, and is compact on phones so the marker and zoom controls stay visible.
  - Header no longer overlaps between 641–900px; phones show the place label with an ellipsis.
  - Quiet boarding pass sizes to its content (phone Demo: 610px → 393px).
  - 3D hints say “Drag to move” on touch screens and are hidden on phones during a flight so they don't cover the model.
  - Dark-mode 5 nm zone ring has higher contrast (`zone-circle` class on the Leaflet circle).
  - Layout fixes are grouped at the end of `app/globals.css` under “Visual pass, 29 Sep 2026”.
  - 30/30 tests, TypeScript, and lint pass; no console errors. The production build still needs `npm run check` on the Mac.
- Publishing cleanup on 29 September (later session):
  - **Aircraft model:** the project owner chose to keep the original Boeing 737-200 model (`public/models/boeing_737-200_white.glb`, LucasSS, Sketchfab Standard License) and confirmed permission to use it and include it in the public repository. `components/sky/aircraft-assets.ts`, the footer credit, and README attribution point to it. The briefly substituted `low_poly_airplane.glb` was moved out of the repository to `../unused-assets/` and is not referenced.
  - **Template leftovers removed:** `build/sites-vite-plugin.ts` (mock “sign in with ChatGPT” middleware) and its license, `.openai/hosting.json`, and all of `scripts/` (execution-profile, pnpm/CI installers, Sites environment wrappers, bounded build). `vite.config.ts` no longer declares placeholder D1/R2 bindings or managed-Linux server settings; `cloudflare-env.d.ts` drops `DB` and `BUCKET`.
  - **Scripts:** `dev` is now `vinext dev --port 5173` and `build` is `vinext build` (the same commands the removed wrapper ran on this Mac's “portable” profile). `start` calls Wrangler directly. New `typecheck` and `check` scripts; CI uses `npm run typecheck`.
  - **Checks:** 29/29 tests, TypeScript, and lint passed (lint keeps the one `<img>` warning). The production build could not be run in that session's sandbox, which lacked macOS-native build binaries and package-registry access. Run `npm run check` on the Mac before the first push; GitHub Actions also runs it.
  - **Secret scan:** the configured AirLabs key appears in no tracked file and no commit.
- GitHub preparation on 29 September: the server on port 5173 was stopped. The package is named `overhead`; `.env.example` contains only a placeholder, and `.gitignore` excludes `.env.local`, dependencies, build output, local Cloudflare state, TypeScript cache, local agent/tool state, and the older DOCX review artifact. A GitHub Actions workflow runs tests, type checks, lint, and build. No remote is configured.
- On 29 September, after adding the shared budget and manual Live refresh, 29 tests, TypeScript, lint, and the production build passed. Lint still reports the existing `<img>` performance warning; the build still reports the separate large 3D chunk. The built Wrangler configuration includes the Durable Object binding and SQLite migration. A local built Worker with a fake AirLabs key handled a Live request, and its Durable Object SQLite store contained one reservation. The development server responds on `http://localhost:5173/`. Browser visual checks remain unavailable because the browser security check denied access again.
- On 29 September, `npm test` passed 26 tests covering API validation, aircraft entry and closer-plane handoff, closest-aircraft tie breaks, missing and old reports, date-line search and partial failure, route verification and recovery, lookup failure and timeout, metadata fan-out, concurrency and overload, partial upstream failures, cache reuse, request limits, spatial response consistency, snapshot age through slow metadata, stale snapshot expiry/recovery, and Demo elapsed time. TypeScript, lint, and the production build passed. The generated worker configuration contains both Cloudflare rate-limit bindings. The build still reports the separate large 3D-loader chunk, and lint still reports the existing `<img>` warning. Browser security checks prevented opening the local app, so no visual review of this pass is claimed. The Live API now timestamps its position snapshot before metadata lookups and reports their processing delay; the browser includes that delay when projecting and expiring aircraft. Airport lookups now use the existing four-call shared concurrency limit without waiting for fixed batches; a test confirms later lookups start while an earlier lookup is slow. If one date-line search fails, the API returns the successful side and a partial-coverage warning that the Live view displays.
- After the Houston consolidation, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. Lint still reports the existing `<img>` performance warning in `components/boarding-pass/flight-identity.tsx`; the build still reports the existing large-chunk warning. A clean development-server restart returned HTTP 200 for `/` and HTTP 404 for the removed `/concept/houston` route. Live and Demo both rendered in the in-app browser, the three Houston scenarios appeared, the United arrival loaded correctly, and the browser console had no errors.
- After the unified project credits were added, TypeScript and lint passed (with the same existing `<img>` warning), and the production build passed (with the same existing large-chunk warning).
- The moving map-line fix was visually verified in the Houston arrival demo: over a 700 ms sample the marker moved from `(384,264)` to `(387,259)`, and both route segments changed their shared endpoint to those exact coordinates. TypeScript, lint, and the production build pass; only the same existing `<img>` and large-chunk warnings remain.
- The theme toggle and dark-mode styles passed TypeScript, lint (with the existing `<img>` warning), and the production build (with the existing large-chunk warning). The most recent contrast changes passed `npm run build`. A visual review of those changes remains open: browser access to the local app was denied because the browser security check was unavailable, including on retry. The last pass was a CSS audit, not a screenshot review.
- The local development server was stopped at the end of the 29 September session (Ctrl+C in the owner's Terminal). `.env.local` already exists locally; preserve it and never put the API key in documentation or chat output.

## First check next time

See **Open items** under “Start here” above.

## Key files

- `app/page.tsx`, `lib/demo-data.ts`: Houston Demo and mode switch.
- `components/sky/live-sky.tsx`, `app/api/sky/route.ts`: Live UI and server data.
- `worker.ts`, `lib/airlabs-quota.ts`, `lib/airlabs-budget-window.ts`: account-wide AirLabs request budget.
- `components/controls/theme-provider.tsx`, `components/controls/theme-toggle.tsx`, `app/globals.css`: page-session theme, header toggle, and dark-mode styles.
- `components/boarding-pass/flip-heading.tsx`, `components/boarding-pass/boarding-pass-display.tsx`, `app/globals.css`: headline flip, boarding-pass transitions, and shared styles.
- `components/sky/aircraft-model.tsx`, `components/sky/hero-cloud.tsx`, `components/map/flight-map.tsx`: 3D aircraft, interactive clouds, and map.

See `README.md` for the full architecture and run instructions.
