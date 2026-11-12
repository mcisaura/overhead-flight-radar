# Overhead

A personal flight-watching project inspired by British Airways’ **#LookUp** campaign. It shows nearby aircraft with a boarding pass, interactive 3D models, a map, and weather.

- **Live:** aircraft reported within a selected radius (1–25 nautical miles, default 5). Starts in downtown Houston. Use device location or choose a point on the map.
- **Demo:** three fictional flight presets with pause, replay, and draggable progress controls. Choose a location and radius without an AirLabs key or browser location access. Houston presets use sample routes; other locations show local entry/exit directions.

Both modes support light/dark appearance, three sky backgrounds, and weather units. Live positions are estimates; routes may be incomplete, and the 3D models represent broad aircraft categories.

## Choose a location and zone

In Live, **Use my location** requests the browser’s location permission; the adjacent arrow opens the manual picker. Demo has a single **Choose location & zone** button and never requests device location.

- **Map:** drag to move the zone, tap to recenter, or use the arrow keys. The zone follows the map center while panning, and zoom stays unchanged when moving it. Changing screen size preserves the selected center.
- **Search:** type a city or postcode below the map. Suggestions update after a short pause once you enter two characters. Enter searches immediately; Down/Up navigate suggestions, and Enter selects one. Clear removes the search; Escape clears a nonempty search before dismissing the dialog.
- **Radius:** choose 1–25 nautical miles from the center. Map, aircraft selection, and crossing progress use the same radius.
- **Apply or cancel:** **Apply location & zone** saves the current map center, including during a moving pan. Cancel, the close button, or Escape outside search leaves the current sky unchanged.

Location selection supports **85°S–85°N**. Location and radius are shared between Live and Demo for the current session and reset on reload. Demo crossings move with the zone; opening the picker pauses playback, and closing it resumes a previously playing simulation.

### Location permission on iPhone

Safari controls the native permission prompt. If access is blocked, the app shows iPhone-specific instructions, **Check again**, and **Choose on the map instead**.

In Safari’s Page Menu, open **Website Settings** (or **More**) and set **Location** to **Ask** or **Allow**. Also check **Settings → Privacy & Security → Location Services → Safari Websites → While Using the App**. Return to the site and choose **Check again**. See [Apple’s website-permission guidance](https://support.apple.com/en-ie/guide/iphone/iphb01fc3c85/ios).

Device location needs HTTPS, except on localhost. For phone testing, a plain HTTP local-network address will not provide the same permission flow as the public HTTPS site. Manual map selection remains available without device permission.

## Pixel pilot and preview controls

A pixel pilot in a navy uniform and gold-banded cap follows the progress bar. During the 40–60% overhead cue, he raises a finger and shows a pixel “Look up” bubble. In Demo playback, his four-pose walk and subtle body bob continue while pointing, and movement between position updates is smoothed.

- **Drag:** move the pilot left or right to preview the flight. Lift and release him to drop back onto the bar.
- **Keyboard:** focus the pilot and use the arrow keys to move by 1%; hold Shift for 10%. Home and End go to the start and end.
- **Playback:** scrubbing pauses the simulation. Use Resume to continue from the chosen position, or Replay to restart.
- **Reduced motion:** the pilot uses a still pose; walking, body bob, movement transitions, and the animated drop are disabled. The pointing cue and preview controls remain available.

Live uses a non-interactive progress indicator. The pilot pauses near the midpoint before walking back as the aircraft leaves.

## Run locally

Requires Node.js 22.13 or newer and npm.

```bash
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). To start directly in Demo, use [localhost:5173/?mode=demo](http://localhost:5173/?mode=demo).

For Live data, copy `.env.example` to `.env.local` and set `AIRLABS_API_KEY`. Keep an existing configured file. `.env.local` is ignored by Git, and the key stays on the server. Demo needs no key, but its map loads tiles over the internet.

## Checks and build

```bash
npm run check     # tests, type checks, lint, and production build
npm run build     # build only
npm start         # serve the built Worker locally
```

Tests can also run on their own with `npm test`. One GitHub Actions workflow runs `npm run check` on pushes to `main`, or manually from the Actions tab. It does not deploy the app or require an AirLabs key.

## Files

```text
app/          Page, layout, styles, and /api/sky
components/   Boarding pass, sky, map, and controls
lib/          Flight calculations, Demo data, and API types
public/       Models, images, and fonts used by the app
tests/        Flight logic and API regression tests
docs/         Short development notes
worker.ts     Cloudflare Worker and shared API budget
wrangler.jsonc Cloudflare deployment settings
```

Built with React, TypeScript, Tailwind CSS, Three.js, Leaflet, and vinext (Next-style routing on Vite). The production build targets Cloudflare Workers.

## Live hosting

Open [Overhead](https://overhead-flight-radar.sankarpete.workers.dev/) or [Demo](https://overhead-flight-radar.sankarpete.workers.dev/?mode=demo).

Cloudflare is connected to [GitHub’s `main` branch](https://github.com/mcisaura/overhead-flight-radar), which is the source of truth. Each push runs `npm run check` and deploys with `npm run deploy`. Preview builds are disabled.

For a manual deployment of the latest GitHub version, run `npm run build` then `npm run deploy` after signing in to Wrangler. Cloudflare stores `AIRLABS_API_KEY` as a Worker secret; visitors share this server-side key. Never add it to GitHub or a build variable.

The app caps new AirLabs calls at 900 per rolling 31 days. This counter cannot count earlier calls or other apps sharing the account, so check the provider’s current usage before enabling Live. `wrangler.jsonc` configures the rate limits and persistent shared budget; `npm run types` refreshes its binding types.

## Credits

Aircraft data: [AirLabs](https://airlabs.co/). Weather and location search: [Open-Meteo](https://open-meteo.com/), with location data from [GeoNames](https://www.geonames.org/). Maps: [OpenStreetMap](https://www.openstreetmap.org/copyright), displayed with [Leaflet](https://leafletjs.com/). 3D rendering: [Three.js](https://threejs.org/).

| Asset | Creator | License |
| --- | --- | --- |
| [Boeing 737-200](https://sketchfab.com/3d-models/boeing-737-200-white-81030e446b7a40d29d83840e3ed878b3) | LucasSS | Sketchfab Standard; supplied with permission to include in this project and repository |
| [Cessna 310](https://sketchfab.com/3d-models/cessna-310-airplane-low-poly-bbf73d06537c4a2ba86b96a3b97209c1) | BorealRiver | CC BY 4.0 |
| [Helicopter](https://sketchfab.com/3d-models/helicopter-dec45a28e6f346648c3d6585426157b8) | linus1178 | CC BY 4.0 |
| [Cloud](https://sketchfab.com/3d-models/low-poly-cloud-81910476b24d4fc5a73c908d6c2a38a2) | Hyungjung Kim | CC BY-NC 4.0 |

The pixel pilot and “Look up” dialogue are drawn directly in SVG in `components/sky/progress-walker.tsx`. Their styling and animation live in `app/globals.css`.

Fonts: supplied Frutiger, Barlow Condensed, and OCR-B, plus system Helvetica and local DIN when available. Barlow Condensed and OCR-B license files are included in `public/fonts/`. The cloud model has a non-commercial license. Third-party assets keep their own terms.
