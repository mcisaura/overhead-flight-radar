# Overhead

Overhead shows aircraft currently reported within 5 nautical miles of a chosen location. Live mode opens on central Chicago, labeled as a reference location. Select **Use my location** to see the sky near you. The header contains the Live/Sandbox toggle, selected place, and a compact weather strip. Sandbox has five fictional flights and sample weather.

The project was inspired by British Airways' 2013 **#LookUp** campaign, which connected planes in the sky to information shown on a billboard.

## Run locally

Requires Node.js 22.13 or newer and npm:

```bash
npm ci
echo 'AIRLABS_API_KEY=your_key' > .env.local
npm run dev
```

Replace `your_key` with your AirLabs API key. Open `http://localhost:5173/` for the app. Live data requires internet access. To verify the project:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Live data

- **AirLabs:** nearby aircraft positions and their reported origin and destination, refreshed through the app every 30 seconds. The server caches each area query for 30 seconds and airport, airline, and fleet lookups for one day. Airline names and aircraft models come from AirLabs where available; common codes have local fallbacks. The selected airline's logo uses AirLabs' logo URL, and known airlines get brand color badges. Missing logos fall back to initials; unknown airlines use a neutral color. Hover or focus a flight name or aircraft model to see its raw code. The API key stays on the server in `.env.local` as `AIRLABS_API_KEY`. Missing altitude or route details are shown as unavailable.
- **Open-Meteo:** current weather, cached for ten minutes.
- **OpenStreetMap:** map tiles, with attribution on the map.

The map uses a pale wireframe-style treatment with projected flight lines. For live flights, airport coordinates are looked up from AirLabs for up to the 16 nearest aircraft plus the tracked aircraft, then cached for one day. A solid line links a known departure airport to the aircraft and a dashed line projects onward to a known arrival airport; neither line is a recorded flight track. When both airport coordinates are available, **Full route** zooms out to show the endpoints. Otherwise the map shows a short heading projection in **Local sky** view. Sandbox routes use approximate airport coordinates and are illustrative.

The hero aircraft is a generic 3D illustration rendered with Three.js in React. Commercial aircraft use the supplied Boeing 737-200 model, private and small fixed-wing aircraft use the Cessna 310, and helicopters and similar rotorcraft use the helicopter model. AirLabs' aircraft type code and model name determine the category; an airline identity helps identify commercial flights when the type is ambiguous. These models are visual stand-ins, while the boarding pass keeps each flight's reported type. Drag the aircraft to move it temporarily, or Shift-drag/right-drag to rotate it; it returns to the moving flight path on release. The live hero starts with the closest aircraft approaching the chosen location, using estimated positions between reports, and keeps that flight on screen through its full crossing. Once it leaves the zone, the app chooses the next closest approaching aircraft or shows the quiet-sky pass. Selecting a map marker previews that aircraft on the map without changing the hero. Reported positions can be delayed or missing. Live mode does not request browser location until the user selects **Use my location**. If location is unavailable, central Chicago remains the reference location.

The live flight feed no longer calls ADSB.fi or ADSBdb.

## Sandbox

The Sandbox contains five fictional flights near a sample Chicago location, including a private plane and a helicopter. Select a preset to watch an accelerated crossing, pause, resume, replay, or scrub its position. The boarding pass heading changes from “Drawing closer” to “Heading away” as the sample aircraft crosses the zone. Sandbox flights and weather are local fixtures; switching to Sandbox does not request live flight or weather data. Map tiles still come from OpenStreetMap.

## Boarding pass

The hero uses a boarding pass card in both its quiet and active states. The pass keeps the same top-left position across states and flight scenarios. Its status occupies a consistent top row, and the dark headline panel uses self-hosted Barlow Condensed lettering inspired by split-flap displays. The panel keeps a stable height while it flips on aircraft and crossing-state changes; reduced-motion preferences make the change immediate. With no flight, the card reads “A quiet sky. For now.” and its perforated stub shows the observation zone and the relevant controls. When a flight is present, the pass shows the reported airline and aircraft, origin and destination. Its stub keeps three identifier positions for the IATA flight code, a distinct ICAO callsign when available, and the aircraft type code, using a dash for missing values. Below a divider, larger altitude, ground speed, and distance values appear with the relevant controls: **Use my location** and **Refresh** in Live mode, or playback controls in Sandbox. The full model name remains at the top. Aircraft details such as winglets appear in italics after the base model name. Hover or focus the flight name and aircraft model to see their raw codes. Live details also show the age of the last report and whether the displayed position is estimated. The card does not invent a seat, gate, or departure time when these are not confirmed by the data source.

## Weather in the header

The weather readout sits in the main header row between the logo and mode controls. Live mode shows current temperature, conditions, cloud cover, and wind from Open-Meteo. Sandbox shows clearly labeled sample conditions. At narrower widths, the header hides the secondary weather details and places the mode and location controls on a second row within the header.

## Motion and progress

Sandbox flights have accelerated playback controls. Live mode estimates map positions and crossing progress four times per second between 30-second AirLabs polls using the last reported position, heading, and ground speed. The live hero selects the nearest approaching aircraft when it needs a new flight, then follows it until it exits the zone. Aircraft without a reported heading are not considered for a new selection. Progress follows the aircraft's projected crossing of the 5-nautical-mile circle, so an off-center pass can reach 100% when it leaves the circle; it does not need to fly directly overhead. The thin line at the bottom of the sky section shows crossing progress: a pixel figure walks from the start to the midpoint, points from 40% to 60%, stands still at the midpoint from 50% to 60%, then turns and walks back to the start as crossing progress reaches 100%. A small percentage sits at the right end.

Projection stops 90 seconds after the underlying report so it can continue throughout the 30-second polling interval even when the source position is already delayed; if heading or speed is missing, the position stays at the last report. These are straight-line estimates, not confirmed flight tracks: turns, climbs, speed changes, delayed reports, and coverage gaps can make the displayed position wrong. The marker and progress may shift when a new report corrects the estimate. The interface labels estimates in the flight details, and reduced-motion preferences turn off transitions.

## Main files

- `app/live-sky.tsx`: live header and weather, hero, polling, location choice, and details.
- `app/page.tsx`: mode toggle, Sandbox header and weather, and Sandbox experience.
- `app/boarding-route.tsx`, `app/boarding-pass-extras.tsx`: boarding pass route, stats, and stub.
- `app/flight-identity.tsx`, `app/aircraft-model-label.tsx`, `lib/flight-display.ts`: readable flight and aircraft labels, codes, and airline presentation.
- `app/api/sky/route.ts`: server-side live API aggregation and caching.
- `app/flight-map.tsx`: interactive Leaflet map.
- `app/aircraft-model.tsx`, `lib/aircraft-visual.ts`: Three.js rendering and selection of the supplied aircraft models in Live and Sandbox.
- `app/demo-data.ts`: Sandbox flights and weather.
- `lib/zone-progress.ts`, `lib/flight-estimate.ts`, `lib/closest-approach.ts`: crossing calculations, movement estimates, and closest-approach messages.

Before public hosting, review the source terms and request limits for [AirLabs](https://airlabs.co/docs/flights), [Open-Meteo](https://open-meteo.com/en/terms), and [OpenStreetMap tiles](https://operations.osmfoundation.org/policies/tiles/). No deployment is configured here.

The Boeing 737-200 model is by LucasSS on Sketchfab, supplied as `boeing_737-200_white.glb` under the Sketchfab Standard License. See the attribution embedded in the GLB asset for its source URL.

The Cessna 310 model is by BorealRiver on [Sketchfab](https://sketchfab.com/3d-models/cessna-310-airplane-low-poly-bbf73d06537c4a2ba86b96a3b97209c1), supplied as `cessna_310_airplane_-_low_poly.glb` under CC BY 4.0. The helicopter model is by linus1178 on [Sketchfab](https://sketchfab.com/3d-models/helicopter-dec45a28e6f346648c3d6585426157b8), supplied as `helicopter.glb` under CC BY 4.0. Their GLB metadata also includes author, license, and source information.
