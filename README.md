# Overhead

Overhead shows aircraft currently reported within 5 nautical miles of a chosen location. Live mode opens on central Chicago, labeled as a reference location. Select **Use my location** to see the sky near you. The header contains the Live/Sandbox toggle, selected place, and a compact weather strip. Sandbox has four fictional flights and sample weather.

The project was inspired by British Airways' 2013 **#LookUp** campaign, which connected planes in the sky to information shown on a billboard.

## Run locally

Requires Node.js 22.13 or newer and npm:

```bash
npm ci
echo 'AIRLABS_API_KEY=your_key' > .env.local
npm run dev
```

Replace `your_key` with your AirLabs API key. Open `http://localhost:5173/`. Live data requires internet access. To verify the project:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Live data

- **AirLabs:** nearby aircraft positions and their reported origin and destination, refreshed through the app every 30 seconds. The server caches each area query for 30 seconds and airport, airline, and fleet lookups for one day. Airline names and aircraft models come from AirLabs where available; common codes have local fallbacks. The selected airline's logo uses AirLabs' logo URL, and known airlines get brand color badges. Missing logos fall back to initials; unknown airlines use a neutral color. Hover or focus a flight name or aircraft model to see its raw code. The API key stays on the server in `.env.local` as `AIRLABS_API_KEY`. Missing altitude or route details are shown as unavailable.
- **Open-Meteo:** current weather, cached for ten minutes.
- **OpenStreetMap:** map tiles, with attribution on the map.

The hero aircraft image is an illustration. Map markers show the latest reported aircraft positions with a short estimated movement between reports. Reported positions can be delayed or missing, and the nearest reported aircraft can change between refreshes. Live mode does not request browser location until the user selects **Use my location**. If location is unavailable, central Chicago remains the reference location.

The live flight feed no longer calls ADSB.fi or ADSBdb.

## Sandbox

The Sandbox contains four fictional flights near a sample Chicago location. Select a preset to watch an accelerated crossing, pause, resume, replay, or scrub its position. The boarding pass heading changes from “Drawing closer” to “Heading away” as the sample aircraft crosses the zone. Sandbox flights and weather are local fixtures; switching to Sandbox does not request live flight or weather data. Map tiles still come from OpenStreetMap.

## Boarding pass

When a flight is present, the left side becomes a boarding pass style card; the original welcome view returns when no flight is selected. The pass shows the reported airline and aircraft, origin and destination. Its perforated bottom stub shows the IATA flight code, a distinct ICAO callsign when available, and the aircraft type code. Below a divider, larger altitude, ground speed, and distance values appear with the relevant controls: **Use my location** and **Refresh** in Live mode, or playback controls in Sandbox. The full model name remains at the top. Aircraft details such as winglets appear in italics after the base model name. Hover or focus the flight name and aircraft model to see their raw codes. Live details also show the age of the last report and whether the displayed position is estimated. The card does not invent a seat, gate, or departure time when these are not confirmed by the data source.

## Weather in the header

The weather strip sits below the logo and mode controls inside the header. Live mode shows current temperature, conditions, cloud cover, and wind from Open-Meteo. Sandbox shows clearly labeled sample conditions. On smaller screens the strip wraps to fit; weather is no longer repeated below the map.

## Motion and progress

Sandbox flights have accelerated playback controls. Live mode estimates map positions and crossing progress four times per second between 30-second AirLabs polls using the last reported position, heading, and ground speed. Heading determines whether the aircraft is drawing closer to or heading away from the chosen location, and the live headline changes between “Drawing closer” and “Heading away.” When heading is unavailable, the headline says “Live aircraft nearby”; crossing progress is unavailable until a heading is reported. Progress follows the aircraft's projected crossing of the 5-nautical-mile circle, so an off-center pass can reach 100% when it leaves the circle; it does not need to fly directly overhead. The thin line at the bottom of the sky section shows crossing progress: a pixel figure points from 40% to 60%, eases into a brief hold at 50%, then eases back into movement, while a small percentage sits at the right end. If a flight disappears from the feed near the edge while heading away, the interface briefly shows an estimated 100% exit.

Projection stops 90 seconds after the underlying report so it can continue throughout the 30-second polling interval even when the source position is already delayed; if heading or speed is missing, the position stays at the last report. These are straight-line estimates, not confirmed flight tracks: turns, climbs, speed changes, delayed reports, and coverage gaps can make the displayed position wrong. The marker and progress may shift when a new report corrects the estimate. A flight that disappears because of a coverage gap may not reach 100%. The interface labels estimates in the flight details, and reduced-motion preferences turn off transitions.

## Main files

- `app/live-sky.tsx`: live header and weather, hero, polling, location choice, and details.
- `app/page.tsx`: mode toggle, Sandbox header and weather, and Sandbox experience.
- `app/boarding-route.tsx`, `app/boarding-pass-extras.tsx`: boarding pass route, stats, and stub.
- `app/flight-identity.tsx`, `app/aircraft-model-label.tsx`, `lib/flight-display.ts`: readable flight and aircraft labels, codes, and airline presentation.
- `app/api/sky/route.ts`: server-side live API aggregation and caching.
- `app/flight-map.tsx`: interactive Leaflet map.
- `app/demo-data.ts`: Sandbox flights and weather.
- `lib/zone-progress.ts`, `lib/flight-estimate.ts`, `lib/closest-approach.ts`: crossing calculations, movement estimates, and closest-approach messages.

Before public hosting, review the source terms and request limits for [AirLabs](https://airlabs.co/docs/flights), [Open-Meteo](https://open-meteo.com/en/terms), and [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/). No deployment is configured here.
