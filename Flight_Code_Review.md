# Flight Project Code Review

*Overhead  |  Repository review  |  28 September 2026*

Overhead is a coherent, working prototype. Its Live data, Demo playback, map, and boarding pass have clear roles. TypeScript, lint, and the production build pass. Before public hosting, the live API needs protection against upstream quota exhaustion. The next priorities are stale aircraft handling, search coverage, and route verification.

This document records the review findings and a remediation sequence for a future work session. No application code was changed during the review.

## 1  Executive Summary

No critical issue or confirmed secret exposure was found. One high-priority security and availability issue affects a public deployment. Five medium-priority correctness issues concern live data or Demo timing. Two low-priority findings concern observability and starter scaffolding. There is no application test suite.

## 2  Architecture Overview

The React page selects Live or Demo and owns settings shared across both modes. LiveSky polls GET /api/sky and estimates movement between reports. The API route fetches AirLabs flights and metadata plus Open-Meteo weather, then returns normalized aircraft data. Demo uses local fixtures and playback calculations. Both views render shared boarding-pass components, a Leaflet map with OpenStreetMap tiles, and Three.js aircraft or clouds.

The separation is generally sensible. The main coupling risk is that the page, LiveSky, and API route each carry orchestration and related but separate flight shapes. A shared validated response type would reduce server and UI drift.

## 3  Critical and High Priority Findings

### F1  Public requests can exhaust the AirLabs allowance

*High  |  Security and availability  |  Security vulnerability for public deployment*

**Location:** app/api/sky/route.ts:110-130, 152-185

**Issue:** The endpoint accepts any valid coordinates without a request limit. New locations bypass the 30-second area cache. A response may cause airport lookups for up to 16 aircraft, then airline and fleet lookups.

**Impact and scenario:** A script repeatedly requests changing coordinates, consuming upstream quota and worker time until the live feature becomes unavailable or costly.

**Recommended fix:** Add a server or edge rate limit before public hosting. Cap metadata lookup fan-out and concurrency, and monitor upstream requests and quota failures. Caching alone cannot constrain user-chosen cache keys.

## 4  Medium Priority Findings

### F2  Aircraft can remain displayed after polling fails

*Medium  |  Correctness and error handling  |  Confirmed bug*

**Location:** app/live-sky.tsx:93-120, 141-158; lib/flight-estimate.ts:19-45

**Issue:** A failed request sets an error but keeps the last aircraft data. Estimation stops at 90 seconds, while the hero and map can continue showing the frozen position.

**Impact and scenario:** Connectivity fails while a plane is inside the zone; minutes later it can still appear nearby, despite an interrupted-feed message.

**Recommended fix:** Expire retained snapshots after a defined age. Remove them from the active hero and map or present a clearly separate stale state. Test recovery on the next successful poll.

### F3  Search box misses aircraft moving into the zone

*Medium  |  Correctness and data coverage  |  Confirmed logic gap*

**Location:** app/api/sky/route.ts:39-44, 136-149

**Issue:** The upstream query covers reported positions only inside the zone bounding box, then estimates those positions forward. Aircraft reported just outside the box cannot be considered even when their estimated position is inside.

**Impact and scenario:** A fast aircraft crosses into the zone between reports and is omitted until its next source update.

**Recommended fix:** Expand the query by a bounded travel allowance based on accepted report age and plausible speed. Keep the precise projected-distance filter and handle longitude wraparound.

### F4  Failed airport lookup can be called an available route

*Medium  |  Data integrity  |  Confirmed bug*

**Location:** app/api/sky/route.ts:81-90, 152-174; app/live-sky.tsx:177-190

**Issue:** Failed lookups return airport objects with null coordinates. The route is marked available when both objects exist, even though plausibility could not be checked. Aircraft beyond the first 16 receive no airport lookup, while raw endpoint codes may still appear in the queue.

**Impact and scenario:** Metadata times out for a mismatched reported route; the boarding pass presents its endpoints while the map cannot verify or display a full route.

**Recommended fix:** Represent reported, verified, unverified, and implausible states separately. Claim verification only when both coordinates exist and the plausibility check runs.

### F5  Live API fields disagree about aircraft position

*Medium  |  API consistency  |  Confirmed bug*

**Location:** app/api/sky/route.ts:136-149, 195-205

**Issue:** Selection uses projected distance, but the returned distance, elevation, and zone progress use the older reported position. The browser recalculates some values later.

**Impact and scenario:** A delayed fast aircraft is selected as inside the zone while direct API consumers receive distance and progress for its earlier position.

**Recommended fix:** Calculate spatial response fields from one selected position; expose reported and estimated positions separately if both are needed.

### F6  Demo playback stretches under timer throttling

*Medium  |  Correctness and state handling  |  Confirmed bug*

**Location:** app/page.tsx:67-85

**Issue:** Each timer callback adds at most 100 ms, even if much more real time elapsed. Background-tab throttling can extend the described 30-second crossing.

**Impact and scenario:** A user starts a Demo flight, switches tabs for a minute, and returns to a flight still near its previous position.

**Recommended fix:** Choose whether playback pauses while hidden or advances in real time. Implement that explicitly with visibility handling or an elapsed-time anchor.

## 5  Low Priority and Maintainability Findings

### F7  Upstream failure details are lost

*Low  |  Observability  |  Maintainability improvement*

**Location:** app/api/sky/route.ts:81-108, 208-220

**Issue:** Flight failures log a generic message; airport, airline, and fleet failures silently become fallback data.

**Impact and scenario:** Quota exhaustion and an upstream outage can look alike, slowing production diagnosis.

**Recommended fix:** Log structured endpoint and failure class or status without logging the API key or precise user location. Count fallback and quota events.

### F8  Unused starter scaffolding obscures the active design

*Low  |  Developer experience  |  Maintainability improvement*

**Location:** db/schema.ts:1-4; db/index.ts:5-13; app/chatgpt-auth.ts:21-49; package.json

**Issue:** The schema is empty; database and ChatGPT authentication helpers have no application callers; broad starter UI and database dependencies remain.

**Impact and scenario:** A new developer may spend time setting up services that Overhead does not use.

**Recommended fix:** Document these as unused starter files or remove them and dependencies proven unused. Retain vendored UI components only if their ready availability is intentional.

## 6  Security Review

The AirLabs key is read on the server and .env files are ignored. No path was found that sends the key to the browser. The map uses a fixed marker SVG and inserts aircraft tooltip labels with textContent; no confirmed XSS or injection path was found. There are no write endpoints, sessions, or user-owned resources requiring authorization checks. The unused authentication helper does not protect the live API. F1 is the actionable security concern. Dependency advisories and deployed controls were not verified by the local checks.

## 7  Testing Gaps

- API integration: invalid coordinates, upstream timeout and quota errors, partial weather failure, cache reuse, and lookup fan-out.
- Flight selection: entry from outside the raw query box, stale and missing reports, handoff to a closer plane, and longitude wraparound.
- Route handling: plausible and implausible pairs, missing coordinates, failed lookups, and more than 16 nearby aircraft.
- UI workflows: stale-feed expiry and recovery, geolocation denial, and Live/Demo switching.
- Demo timing: pause, scrub, replay, completion, and tab visibility changes.

These should verify behavior across the server and UI boundary, rather than only mirror utility implementation.

## 8  Performance Review

The strongest performance concern is upstream request fan-out in F1. The build also reports a client chunk above 500 kB; the main page chunk is about 672 kB on disk. The app schedules all three aircraft model downloads even when the sky is quiet (app/aircraft-assets.ts:27-44). Measure startup on mobile before changing this. Leaflet is dynamically imported when the map nears the viewport, which limits initial map work.

## 9  Codebase Cleanup

A shared typed contract for GET /api/sky should make reported versus estimated positions and route verification explicit. That would address F4 and F5 directly. The unused database, authentication helper, sample D1 files, and dependencies can be removed once the project decides whether to remain a starter template. README.md and HANDOFF.md are useful; release operations should also document upstream limits and stale-feed behavior.

## 10  Prioritized Action Plan

| When | Work |
| --- | --- |
| Immediately before public hosting | F1: Rate-limit and monitor the live API; bound upstream fan-out. |
| Before the next release | F2-F5: Expire stale aircraft, widen the search, represent route verification accurately, and make API spatial fields consistent. |
| When practical | F6-F7: Define Demo visibility timing, add workflow tests, and improve diagnostics. |
| Optional | F8: Measure client startup cost; remove unused starter files and dependencies. |

## 11  Overall Project Map

| Path | Responsibility |
| --- | --- |
| app/page.tsx, app/live-sky.tsx, app/demo-data.ts | Mode selection, Demo playback, Live polling, and fixtures |
| app/api/sky/route.ts | Public live API, upstream fetching, caching, and enrichment |
| lib/ | Position, route, zone, display, and weather calculations |
| app/flight-map.tsx | Leaflet map, markers, and route lines |
| app/boarding-*, app/flight-identity.tsx | Shared flight presentation |
| app/aircraft-model.tsx, app/hero-cloud.tsx, app/aircraft-assets.ts | Three.js scenes and model loading |
| public/ | Images, fonts, and 3D models |
| vite.config.ts, scripts/, .openai/hosting.json | Build and hosting integration |
| db/, app/chatgpt-auth.ts, examples/, components/ui/ | Mostly unused starter or vendored support code |

## Verification and Next Session

Verified on 28 September 2026: npx tsc --noEmit, npm run lint, and npm run build passed. Lint reported one image optimization warning; the build reported a large client chunk. No code was changed. Start the next session with F1, then resolve F2-F5 with integration tests for the affected workflows.
