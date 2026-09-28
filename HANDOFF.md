# Overhead handoff

Use this note when continuing the project in a new chat. The app lives in `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only; work in `flight-overhead/`. This directory is not a Git repository.

## Current product

- `/` has **Live** and a **Houston Demo**. Live defaults to downtown Houston and uses AirLabs flights near the selected location, Open-Meteo weather, and a five-nautical-mile observation zone. The nearest eligible aircraft is featured and can be replaced when another becomes closer.
- Houston Demo has three fictional flights (an IAH-bound commercial arrival, a west-to-east Cessna crossing, and a downtown helicopter patrol), each with a 30-second crossing, pause/resume, replay, scrub, and clear-sky controls.
- The former `/concept/houston` route was removed after its Houston scenarios were folded into the main Demo.
- Live AirLabs routes are checked against the aircraft position. Clearly mismatched airport pairs are removed from the boarding pass, map, and next-aircraft queue and labeled as inconsistent; the app never guesses replacement endpoints. This was added after AirLabs attached `ACK → BOS` to EJA206 while reporting that aircraft near Houston.
- The route guard was verified with the reproduced EJA206 position: `ACK → BOS` was rejected while a plausible `LAX → IAH` path was accepted. TypeScript, lint, and the production build pass; lint retains the existing `<img>` performance warning and the build retains the existing large-chunk warning.
- Cloud dragging and spring-back render at the browser animation-frame cadence, while undisturbed idle clouds retain their lower-power cadence. Tiny residual offsets snap to zero after they become visually imperceptible, preventing a long uneven tail at the end of the return.
- All three views share the boarding pass, split-flap headline animation, 3D aircraft category models, drag/rotate interaction, map, quiet-sky clouds, and weather-unit control. The models are illustrations, not exact representations of every reported type.

## Latest verification

- After the Houston consolidation, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. Lint still reports the existing `<img>` performance warning in `app/flight-identity.tsx`; the build still reports the existing large-chunk warning. A clean development-server restart returned HTTP 200 for `/` and HTTP 404 for the removed `/concept/houston` route. Live and Demo both rendered in the in-app browser, the three Houston scenarios appeared, the United arrival loaded correctly, and the browser console had no errors.
- The local development server was stopped at the user's request. Start it with `npm run dev` from `flight-overhead/` when needed. `.env.local` already exists locally; preserve it and never put the API key in documentation or chat output.

## First check next time

Confirm that `/` renders in both Live and Demo modes after the Houston consolidation. The `next/link` imports associated with the former concept links have been removed.

## Key files

- `app/page.tsx`, `app/demo-data.ts`: Houston Demo and mode switch.
- `app/live-sky.tsx`, `app/api/sky/route.ts`: Live UI and server data.
- `app/flip-heading.tsx`, `app/boarding-pass-display.tsx`, `app/globals.css`: headline flip, boarding-pass transitions, and shared styles.
- `app/aircraft-model.tsx`, `app/hero-cloud.tsx`, `app/flight-map.tsx`: 3D aircraft, interactive clouds, and map.

See `README.md` for the full architecture and run instructions.
