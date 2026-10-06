# Overhead

A personal flight-watching project inspired by British Airways’ **#LookUp** campaign. It shows nearby aircraft with a boarding pass, interactive 3D models, a map, and weather.

- **Live:** aircraft reported within 5 nautical miles of a selected location. Starts in downtown Houston; choose **Use my location** to look nearby.
- **Demo:** three fictional Houston flights with pause, replay, and draggable progress controls. Works without an API key.

Both modes support light/dark appearance, three sky backgrounds, and weather units. Live positions are estimates; routes may be incomplete, and the 3D models represent broad aircraft categories.

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

Aircraft data: [AirLabs](https://airlabs.co/). Weather: [Open-Meteo](https://open-meteo.com/). Maps: [OpenStreetMap](https://www.openstreetmap.org/copyright), displayed with [Leaflet](https://leafletjs.com/). 3D rendering: [Three.js](https://threejs.org/).

| Model | Creator | License |
| --- | --- | --- |
| [Boeing 737-200](https://sketchfab.com/3d-models/boeing-737-200-white-81030e446b7a40d29d83840e3ed878b3) | LucasSS | Sketchfab Standard; supplied with permission to include in this project and repository |
| [Cessna 310](https://sketchfab.com/3d-models/cessna-310-airplane-low-poly-bbf73d06537c4a2ba86b96a3b97209c1) | BorealRiver | CC BY 4.0 |
| [Helicopter](https://sketchfab.com/3d-models/helicopter-dec45a28e6f346648c3d6585426157b8) | linus1178 | CC BY 4.0 |
| [Cloud](https://sketchfab.com/3d-models/low-poly-cloud-81910476b24d4fc5a73c908d6c2a38a2) | Hyungjung Kim | CC BY-NC 4.0 |

Fonts: supplied Frutiger, Barlow Condensed, and OCR-B, plus system Helvetica and local DIN when available. Barlow Condensed and OCR-B license files are included in `public/fonts/`. The cloud model has a non-commercial license. Third-party assets keep their own terms.
