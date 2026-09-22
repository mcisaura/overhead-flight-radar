# Overhead

Overhead is a personal flight-watching web app. It finds the nearest recently reported airborne aircraft, shows its flight details in an illustrated sky, looks up a possible origin and destination, and displays local weather. The app is designed for a public, noncommercial hobby site.

## Run locally

You need Node.js 22.13 or newer and npm. From this directory:

```bash
npm ci
npm run dev
```

Open the local URL printed by the server, usually `http://localhost:5173/`. Choose **Find the plane above me** and allow location access, or use **Enter coordinates instead**. Browser geolocation works on localhost; a hosted version needs HTTPS. Press `Ctrl+C` in the terminal running `npm run dev` to stop the local server.

To check a production build:

```bash
npx tsc --noEmit
npm run build
```

No API keys, database, or account setup are required for the current version.

## How it works

1. The browser obtains the visitor's location only after they choose the location button. Manual latitude and longitude entry is available if permission is unavailable or declined.
2. `app/api/sky/route.ts` asks [adsb.fi](https://github.com/adsbfi/opendata) for aircraft within 20 nautical miles. It ignores ground traffic, positions older than 60 seconds, and aircraft below 500 feet; then it selects the nearest remaining aircraft by ground distance.
3. For that aircraft, the server asks [adsbdb](https://github.com/mrjackwills/adsbdb) for a route associated with its callsign. It checks whether the listed route is geographically plausible before displaying it. Missing or implausible routes appear as unavailable.
4. The server asks [Open-Meteo](https://open-meteo.com/en/terms) for current temperature, cloud cover, wind, and conditions. Weather also appears when no aircraft is nearby.

The browser refreshes its view every 30 seconds. Server requests use short caches. Precise browser coordinates are sent to this app's server, which rounds them to four decimal places for the aircraft and weather requests. The app does not store location or flight history.

**Data limits:** “Nearest” is based on reported position, not confirmed visual sighting. Clouds, coverage gaps, delayed positions, and aircraft without broadcasts can affect the result. Route listings may be missing or outdated even after the plausibility check. The app labels a displayed route as a *listed route* rather than a confirmed itinerary.

## Interface and assets

- `app/page.tsx` contains the location flow, live states, flight hero, and weather details.
- `app/globals.css` defines the responsive visual system and reduced-motion behavior.
- `public/sky-backdrop.png` is an original illustrated sky background.
- `public/aircraft/` contains three original transparent aircraft illustrations selected by reported aircraft type; unknown types use the regional illustration.
- `public/fonts/` contains self-hosted DM Sans and Fraunces fonts and their licenses.

The design refresh follows [Impeccable](https://github.com/pbakaus/impeccable) guidance for clear hierarchy, purposeful motion, responsive layout, and readable interface states. The project uses Next.js-style app routes through the bundled Vinext starter.

## Before public hosting

Review the current terms and request limits of [adsb.fi](https://github.com/adsbfi/opendata), [adsbdb](https://github.com/mrjackwills/adsbdb), and [Open-Meteo](https://open-meteo.com/en/terms) for your intended use. Keep the provider attribution in the footer. No hosting or deployment is configured by this README.
