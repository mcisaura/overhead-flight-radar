# Overhead handoff

Use this note when continuing the project in a new chat. The app lives in `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only; work in `flight-overhead/`. This directory is not a Git repository.

## Current product

- `/` has **Live** and a **Houston Demo**. Live defaults to downtown Houston and uses AirLabs flights near the selected location, Open-Meteo weather, and a five-nautical-mile observation zone. The nearest eligible aircraft is featured and can be replaced when another becomes closer.
- Houston Demo has three fictional flights (an IAH-bound commercial arrival, a west-to-east Cessna crossing, and a downtown helicopter patrol), each with a 30-second crossing, pause/resume, replay, scrub, and clear-sky controls.
- The former `/concept/houston` route was removed after its Houston scenarios were folded into the main Demo.
- Live AirLabs routes are checked against the aircraft position. Clearly mismatched airport pairs are removed from the boarding pass, map, and next-aircraft queue and labeled as inconsistent; the app never guesses replacement endpoints. This was added after AirLabs attached `ACK → BOS` to EJA206 while reporting that aircraft near Houston.
- The route guard was verified with the reproduced EJA206 position: `ACK → BOS` was rejected while a plausible `LAX → IAH` path was accepted. TypeScript, lint, and the production build pass; lint retains the existing `<img>` performance warning and the build retains the existing large-chunk warning.
- Cloud dragging and spring-back render at the browser animation-frame cadence, while undisturbed idle clouds retain their lower-power cadence. Tiny residual offsets snap to zero after they become visually imperceptible, preventing a long uneven tail at the end of the return.
- Live map route segments now use the same estimated aircraft coordinates as their markers and update the existing Leaflet paths in place. Live position interpolation runs at a throttled 30 fps while the page is visible, so the solid arrival and dashed departure lines remain attached to the moving plane without teardown flicker.
- A footer select menu lets the user directly choose the original photo, Houston skyline, or low-poly sky. The state lives in `app/page.tsx`, so the selected background carries between Live and Demo during the page session. Alternate image assets live in `public/hero-houston-skyline.png` and `public/hero-low-poly-sky.png`.
- The Houston skyline and low-poly variants are bottom-centered at `cover` size without the original background's extra scale transform. This preserves each alternate image's lower skyline/horizon edge across desktop and mobile crops.
- The boarding-pass stub seam uses a denser 4px/4px repeating perforation pattern with larger outlined side cutouts, making the tear edge more visually pronounced.
- Active boarding passes use a separate compact layout below 520px: the quiet-state minimum height is removed, heading/route spacing is reduced, long airport names are clamped to two lines, and the next-aircraft queue becomes a compact grid. The reproduced SWA3049 mobile case measured about 488px for the card and 794px for the complete hero at a 390×844 viewport, instead of the oversized card pushing the hero far below the fold.
- Both Live and Demo footers use `app/project-credits.tsx` to credit the project services and assets. Every attribution remains visible in two compact, muted, left-aligned groups: **Data & maps** for AirLabs, Open-Meteo, OpenStreetMap, and Leaflet; and **3D assets** for Three.js plus each aircraft/cloud model creator and applicable license.
- All three views share the boarding pass, split-flap headline animation, 3D aircraft category models, drag/rotate interaction, map, quiet-sky clouds, and weather-unit control. The models are illustrations, not exact representations of every reported type.

## Latest verification

- After the Houston consolidation, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. Lint still reports the existing `<img>` performance warning in `app/flight-identity.tsx`; the build still reports the existing large-chunk warning. A clean development-server restart returned HTTP 200 for `/` and HTTP 404 for the removed `/concept/houston` route. Live and Demo both rendered in the in-app browser, the three Houston scenarios appeared, the United arrival loaded correctly, and the browser console had no errors.
- After the unified project credits were added, TypeScript and lint passed (with the same existing `<img>` warning), and the production build passed (with the same existing large-chunk warning).
- The moving map-line fix was visually verified in the Houston arrival demo: over a 700 ms sample the marker moved from `(384,264)` to `(387,259)`, and both route segments changed their shared endpoint to those exact coordinates. TypeScript, lint, and the production build pass; only the same existing `<img>` and large-chunk warnings remain.
- The local development server was stopped after the latest documentation update. Restart it with `npm run dev` from `flight-overhead/` when needed. `.env.local` already exists locally; preserve it and never put the API key in documentation or chat output.

## First check next time

Confirm that `/` renders in both Live and Demo modes after the Houston consolidation. The `next/link` imports associated with the former concept links have been removed.

## Key files

- `app/page.tsx`, `app/demo-data.ts`: Houston Demo and mode switch.
- `app/live-sky.tsx`, `app/api/sky/route.ts`: Live UI and server data.
- `app/flip-heading.tsx`, `app/boarding-pass-display.tsx`, `app/globals.css`: headline flip, boarding-pass transitions, and shared styles.
- `app/aircraft-model.tsx`, `app/hero-cloud.tsx`, `app/flight-map.tsx`: 3D aircraft, interactive clouds, and map.

See `README.md` for the full architecture and run instructions.
