# Overhead

Overhead is currently a sandbox for a personal flight-watching web app. It shows four fictional aircraft around a sample Chicago location, with preset buttons, an interactive map, illustrative routes, and sample weather. No live flight or weather data is requested in the sandbox interface.

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

Open the local URL printed by the server, usually `http://localhost:5173/`. Choose any preset flight or its marker on the map. Press `Ctrl+C` in the terminal running `npm run dev` to stop the local server.

To check a production build:

```bash
npx tsc --noEmit
npm run build
```

The sandbox needs no API keys. The existing live API code remains available for future work but is disabled unless `FLIGHT_DATA_MODE=live` is explicitly set on the server. The sandbox page does not call that live API. A local AirLabs key in `.env.local` is not used in sandbox mode.

## How it works

1. `app/demo-data.ts` defines the four sample aircraft, their illustrative routes, and sample weather.
2. The preset buttons select the featured flight. Selecting an aircraft marker on the map selects the same preset.
3. `app/api/sky/route.ts` returns sample data by default, without contacting flight or weather providers. The legacy live lookup runs only when the server is explicitly configured with `FLIGHT_DATA_MODE=live`.

The base map uses real OpenStreetMap geography. Aircraft positions, callsigns, routes, and weather are fictional and clearly marked as sample data.

## Interface and assets

- `app/page.tsx` contains the sandbox presets, featured flight, and sample weather details.
- `app/flight-map.tsx` renders the interactive map and aircraft markers using Leaflet. Map tiles are loaded from OpenStreetMap with attribution visible on the map.
- `app/globals.css` defines the responsive visual system and reduced-motion behavior.
- `public/sky-backdrop.png` is an original illustrated sky background.
- `public/aircraft/` contains three original transparent aircraft illustrations selected by reported aircraft type; unknown types use the regional illustration.
- `public/fonts/` contains self-hosted DM Sans and Fraunces fonts and their licenses.

The design refresh follows [Impeccable](https://github.com/pbakaus/impeccable) guidance for clear hierarchy, purposeful motion, responsive layout, and readable interface states. The project uses Next.js-style app routes through the bundled Vinext starter.

## Before public hosting

If restoring live mode, review the current terms and request limits of [adsb.fi](https://github.com/adsbfi/opendata), [adsbdb](https://github.com/mrjackwills/adsbdb), [AirLabs](https://airlabs.co/terms-of-service), and [Open-Meteo](https://open-meteo.com/en/terms) for your intended use. No hosting or deployment is configured by this README.
