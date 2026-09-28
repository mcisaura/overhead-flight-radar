# Overhead handoff

Use this note when continuing the project in a new chat. The app lives in `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only; work in `flight-overhead/`. This directory is not a Git repository.

## Current product

- `/` has **Live** and the original **Chicago Demo**. Live uses AirLabs flights near a selected location, Open-Meteo weather, and a five-nautical-mile observation zone. The nearest eligible aircraft is featured and can be replaced when another becomes closer.
- Chicago Demo has three fictional flights (commercial, Cessna, helicopter), each with a 30-second crossing, pause/resume, replay, scrub, and clear-sky controls.
- `/concept/houston` is a separate **Houston demo concept** with a dusk design and three fictional 30-second crossings: an IAH arrival, a private Cessna, and a helicopter patrol. It uses a downtown Houston map center and sample weather. The main Demo links to it below the scenarios; Live links to it in the footer; the concept links back to `/`.
- All three views share the boarding pass, split-flap headline animation, 3D aircraft category models, drag/rotate interaction, map, quiet-sky clouds, and weather-unit control. The models are illustrations, not exact representations of every reported type.

## Latest verification

- `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed after the Houston page was added. Lint still reports the existing `<img>` performance warning in `app/flight-identity.tsx`; there are no lint errors. The build reports an existing large-chunk warning.
- The Houston route returned HTTP 200. In the in-app browser, the quiet sky and an active United arrival both rendered; selecting the arrival updated the boarding pass, aircraft, map, and telemetry.
- The local development server was stopped at the user's request. Start it with `npm run dev` from `flight-overhead/` when needed. `.env.local` already exists locally; preserve it and never put the API key in documentation or chat output.

## First check next time

During the final server shutdown, the dev log showed an **“Invalid hook call”** after Vite optimized `next/link` and reloaded the browser. It may have been a transient development reload; it was **not** retested after a fresh server start. Start the server, open `/` and `/concept/houston`, follow the link between them, and watch the browser console. If it recurs, inspect the `next/link` imports added to `app/page.tsx`, `app/live-sky.tsx`, and `app/concept/houston/page.tsx`, plus the Vinext dependency optimization. Keep the existing Chicago and Live behavior intact while fixing it.

## Key files

- `app/page.tsx`, `app/demo-data.ts`: Chicago Demo and mode switch.
- `app/live-sky.tsx`, `app/api/sky/route.ts`: Live UI and server data.
- `app/concept/houston/page.tsx`, `houston-data.ts`, `houston.css`: Houston concept.
- `app/flip-heading.tsx`, `app/boarding-pass-display.tsx`, `app/globals.css`: headline flip, boarding-pass transitions, and shared styles.
- `app/aircraft-model.tsx`, `app/hero-cloud.tsx`, `app/flight-map.tsx`: 3D aircraft, interactive clouds, and map.

See `README.md` for the full architecture and run instructions.
