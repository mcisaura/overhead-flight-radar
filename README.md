# Overhead

Overhead is currently a sandbox for a personal flight-watching web app. It starts with an empty sky around a sample Chicago location. Four preset buttons can trigger fictional aircraft to enter the zone, cross the interactive map, and leave. The sandbox also shows illustrative routes and sample weather. No live flight or weather data is requested in the sandbox interface.

## Inspiration

British Airways' **#LookUp** campaign, launched in London in November 2013, inspired this project. Its digital billboards used custom aircraft-detection technology to respond to British Airways planes passing overhead. A child on the screen pointed toward the aircraft while the display showed details about that flight. Overhead brings that moment of curiosity to a personal web app: look up, find a plane, and learn where its journey may lead.

Read more: [SimpliFlying's contemporary coverage](https://simpliflying.com/blog/british-airways-plane-detecting-billboards-showcase-magic-flying-lookup), [The Drum's retrospective](https://www.thedrum.com/news/worlds-best-ooh-ads-ever-10-ba-rediscovers-wonder-in-the-skies), [Engadget's 2013 report](https://www.engadget.com/2013-11-22-british-airways-billboard.html), and the [campaign video](https://www.youtube.com/watch?v=z3aWjM1rmV0).

Additional video inspiration: [YouTube video shared by the project creator](https://youtu.be/1c9FS5Myn4k?si=qQ2n8p-pZ2wPDhHh).

## Run locally

You need Node.js 22.13 or newer and npm. From this directory:

```bash
npm ci
npm run dev
```

Open the local URL printed by the server, usually `http://localhost:5173/`. Choose a preset flight to start its simulated crossing. The flight screen appears at entry and returns to the empty sky shortly after exit. You can pause, resume, reset, scrub, or clear the sky. Press `Ctrl+C` in the terminal running `npm run dev` to stop the local server.

To check a production build:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The sandbox needs no API keys. The existing live API code remains available for future work but is disabled unless `FLIGHT_DATA_MODE=live` is explicitly set on the server. The sandbox page does not call that live API. A local AirLabs key in `.env.local` is not used in sandbox mode.

## How it works

1. `app/demo-data.ts` defines the four sample aircraft, their illustrative routes, and sample weather.
2. The page begins with no active aircraft. A preset triggers an entry event, reveals the flight screen, and starts an accelerated crossing. The hero shows the entry/crossing/exit status, callsign, route, and a progress line. Its aircraft illustration moves across the sky with the same progress value used by the map. The plane exits at 100%, then the interface returns to the empty state. Only the active plane appears on the map.
3. The progress bar spans the aircraft's estimated path through the 20-nautical-mile radius around the sample location. At the entry edge it reads 0%; at the exit edge it reads 100%. The aircraft moves continuously through 50%, where the hero briefly highlights the closest approach with a pulse, a larger aircraft, altitude, and distance. It says “Passing overhead” only when the projected path passes within 1 km of the sample location; otherwise it says “Closest approach.” A real aircraft's heading change would alter the estimate.
4. `app/api/sky/route.ts` returns an empty sample sky by default, or one sample aircraft when given a `preset` query parameter. The legacy live lookup runs only when the server is explicitly configured with `FLIGHT_DATA_MODE=live`; its response also includes the calculated zone progress for the selected aircraft.

The base map uses real OpenStreetMap geography. Aircraft positions, callsigns, routes, and weather are fictional and clearly marked as sample data.

## Playback and layout

- **Empty sky:** No aircraft or route is selected on initial load. The hero offers a shortcut to the flight presets.
- **Entry:** Selecting a preset starts playback and brings the hero into view. The aircraft fades in over 0.65 seconds. Its entire illustration stays inside the visible scene from 0% through 100%, clear of the feathered left edge.
- **Crossing:** Progress follows a straight path through a circle with a radius of 20 nautical miles (37.04 km). Playback duration uses path length and the preset's ground speed at 30× acceleration: roughly 10 seconds for the cruising jet, 23 seconds for the arrival, 21 seconds for cargo, and 56 seconds for the helicopter.
- **Midpoint:** The aircraft's center aligns horizontally with the fixed “You are here” marker at 50%. Its scale grows and shrinks on a smooth curve. A pulse and information card appear from 43% to 57%, without slowing or stopping playback. The hero is an illustration; the map and closest-distance label preserve the flight's actual offset from the sample location.
- **Exit:** At 100%, the aircraft moves away and fades out over 1.1 seconds. A departure message appears before the empty sky returns, 2.6 seconds after exit. Clearing the sky early shows a separate clear-sky message.
- **Controls:** Pause, resume, and replay are in the hero. The sidebar beside the map contains the position scrubber, reset-to-entry button, and clear-sky action. Scrubbing or resetting pauses playback; use Resume to continue. Selecting another preset replaces the current flight.
- **Responsive layout:** Desktop places the map and flight summary side by side. Mobile stacks them and gives the aircraft, location marker, and midpoint card separate space. Reduced-motion settings suppress flight movement and scaling while preserving progress and status information.

The standalone crossing panel and duplicate map detail card have been removed from this page. Sandbox identification is consolidated near the top, while weather remains explicitly labeled as sample data.

## Current limitations and verification

The page always uses local fixtures, even if the server's live API mode is enabled. Restoring a live interface requires connecting the page to that endpoint and retaining the selected aircraft across position updates and zone exit. The current closest-approach estimate assumes a straight course and does not track an observed entry point or predict turns.

Aircraft illustrations are decorative type-based assets; the helicopter preset currently uses the regional-aircraft fallback illustration. The “Passing overhead” label uses a horizontal path distance within 1 km, not an exact vertical-overhead measurement.

The latest layout passed TypeScript checks and a production build. Lint reports no errors and one existing warning about the aircraft's plain image element. Browser visual and interaction checks have not been completed for the latest layout.

## Interface and assets

- `app/page.tsx` contains the sandbox presets, featured flight, and sample weather details.
- `app/flight-map.tsx` renders the interactive map and aircraft markers using Leaflet. Map tiles are loaded from OpenStreetMap with attribution visible on the map.
- `app/globals.css` defines the responsive visual system and reduced-motion behavior.
- `lib/zone-progress.ts` contains the shared zone radius, path progress, closest-distance calculation, and demo position interpolation.
- `public/sky-backdrop.png` is an original illustrated sky background.
- `public/aircraft/` contains three original transparent aircraft illustrations selected by reported aircraft type; unknown types use the regional illustration.
- `public/fonts/` contains self-hosted DM Sans and Fraunces fonts and their licenses.

The design refresh follows [Impeccable](https://github.com/pbakaus/impeccable) guidance for clear hierarchy, purposeful motion, responsive layout, and readable interface states. The project uses Next.js-style app routes through the bundled Vinext starter.

## Before public hosting

If restoring live mode, review the current terms and request limits of [adsb.fi](https://github.com/adsbfi/opendata), [adsbdb](https://github.com/mrjackwills/adsbdb), [AirLabs](https://airlabs.co/terms-of-service), and [Open-Meteo](https://open-meteo.com/en/terms) for your intended use. No hosting or deployment is configured by this README.
