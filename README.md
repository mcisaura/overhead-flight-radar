# Overhead

Overhead shows aircraft currently reported within 5 nautical miles of a chosen location. Live mode opens on central Chicago, labeled as a reference location. Select **Use my location** to see the sky near you. The header toggle switches to a separate Sandbox with four fictional flights and sample weather.

The project was inspired by British Airways' 2013 **#LookUp** campaign, which connected planes in the sky to information shown on a billboard.

## Run locally

Requires Node.js 22.13 or newer and npm:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173/`. Live data requires internet access and an AirLabs API key in `.env.local`. To verify the project:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Live data

- **AirLabs:** nearby aircraft positions and their reported origin and destination, refreshed through the app every 30 seconds. The server caches each area query for 30 seconds and airport names for one day. The API key stays on the server in `.env.local` as `AIRLABS_API_KEY`. Missing altitude or route details are shown as unavailable.
- **Open-Meteo:** current weather, cached for ten minutes.
- **OpenStreetMap:** map tiles, with attribution on the map.

The hero aircraft image is an illustration. Map markers show the latest reported aircraft positions with a short estimated movement between reports. Reported positions can be delayed or missing, and the nearest reported aircraft can change between refreshes. Live mode does not request browser location until the user selects **Use my location**. If location is unavailable, central Chicago remains the reference location.

The live flight feed no longer calls ADSB.fi or ADSBdb.

## Sandbox

The Sandbox contains four fictional flights near a sample Chicago location. Select a preset to watch an accelerated crossing, pause, resume, replay, or scrub its position. The brief goodbye message appears in the existing status line at the end. Sandbox flights and weather are local fixtures; switching to Sandbox does not request live flight or weather data. Map tiles still come from OpenStreetMap.

## Motion and progress

Sandbox flights have accelerated playback controls. Live mode estimates map positions and crossing progress four times per second between 30-second AirLabs polls using the last reported position, heading, and ground speed. Heading determines whether the aircraft is coming closer to or moving away from the chosen location, and the live headline changes between “Coming closer” and “Moving away.” When heading is unavailable, it says “A plane is nearby.” Progress follows the aircraft's projected crossing of the 5-nautical-mile circle, so an off-center pass can reach 100% when it leaves the circle; it does not need to fly directly overhead. A closest-approach notice appears around the predicted midpoint of the crossing. If a flight disappears from the feed near the edge while heading away, the interface briefly shows an estimated 100% exit.

Projection stops 90 seconds after the underlying report so it can continue throughout the 30-second polling interval even when the source position is already delayed; if heading or speed is missing, the position stays at the last report. These are straight-line estimates, not confirmed flight tracks: turns, climbs, speed changes, delayed reports, and coverage gaps can make the displayed position wrong. The marker, progress, and closest-approach notice may shift when a new report corrects the estimate. A flight that disappears because of a coverage gap may not reach 100%. The interface labels estimates, and reduced-motion preferences turn off transitions.

## Main files

- `app/live-sky.tsx`: live hero, polling, location choice, details, and weather.
- `app/page.tsx`: mode toggle and Sandbox experience.
- `app/api/sky/route.ts`: server-side live API aggregation and caching.
- `app/flight-map.tsx`: interactive Leaflet map.
- `app/demo-data.ts`: Sandbox flights and weather.
- `lib/zone-progress.ts`: shared crossing calculations.

Before public hosting, review the source terms and request limits for [AirLabs](https://airlabs.co/docs/flights), [Open-Meteo](https://open-meteo.com/en/terms), and [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/). No deployment is configured here.
