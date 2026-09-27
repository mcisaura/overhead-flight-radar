"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, LocateFixed, MapPin, Navigation2, RefreshCw } from "lucide-react";
import FlightMap, { type MapAircraft } from "./flight-map";
import ModeToggle from "./mode-toggle";
import { demoPlace } from "./demo-data";
import { distanceKm, estimatePosition } from "../lib/flight-estimate";
import { ZONE_RADIUS_KM, zoneProgress } from "../lib/zone-progress";
import FlightIdentity, { flightIdentityText } from "./flight-identity";
import BoardingRoute from "./boarding-route";
import { BoardingPassStats, BoardingPassStub } from "./boarding-pass-extras";
import type { AirlineIdentity } from "../lib/flight-display";
import HeroProgressLine from "./hero-progress-line";
import BoardingPassDisplay from "./boarding-pass-display";
import AircraftModel from "./aircraft-model";

type Place = { lat: number; lon: number; label: string; sample: boolean };
type LiveFlight = {
  hex: string; callsign: string | null; registration: string | null; aircraftType: string | null;
  airline?: AirlineIdentity | null; flightNumber?: string | null; flightIata?: string | null; aircraftModel?: string | null;
  altitudeFt: number | null; speedKts: number | null; distanceKm: number; elevationDeg: number | null;
  seenSeconds: number; origin: { code: string; city: string } | null;
  destination: { code: string; city: string } | null;
  routeStatus: string;
  zoneProgress: { percent: number; remainingKm: number; crossingKm: number; closestKm: number; motion?: "approaching" | "leaving" } | null;
};
type SkyResponse = {
  flight: LiveFlight | null;
  aircraft: MapAircraft[];
  nearbyCount: number;
  weather: { temperatureF: number; cloudCover: number; windMph: number; code: number; isDay: boolean } | null;
  updatedAt: string;
  warnings: string[];
};

function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Stormy";
}

export default function LiveSky({ onModeChange }: { onModeChange: (mode: "live" | "sandbox") => void }) {
  const [place, setPlace] = useState<Place>({ lat: demoPlace.lat, lon: demoPlace.lon, label: "Chicago · live sky", sample: true });
  const [data, setData] = useState<SkyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clockMs, setClockMs] = useState(0);
  const trackedHex = useRef<string | null>(null);
  const exitRefreshHex = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => { if (!document.hidden) setClockMs(Date.now()); };
    const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      const requestId = ++latestRequest;
      try {
        const params = new URLSearchParams({ mode: "live", lat: String(place.lat), lon: String(place.lon) });
        if (trackedHex.current) params.set("selected", trackedHex.current);
        const response = await fetch(`/api/sky?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Live sky is temporarily unavailable.");
        const result = await response.json() as SkyResponse;
        if (!active || requestId !== latestRequest) return;
        const now = Date.now();
        trackedHex.current = result.flight?.hex ?? null;
        if (exitRefreshHex.current !== trackedHex.current) exitRefreshHex.current = null;
        setData(result);
        setReceivedAt(now);
        setClockMs(now);
        setError(result.warnings.find((warning) => warning.includes("aircraft")) ?? null);
      } catch (reason) {
        if (active && requestId === latestRequest) setError(reason instanceof Error ? reason.message : "Live sky is temporarily unavailable.");
      } finally {
        if (active && requestId === latestRequest) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [place, refreshKey]);

  const useLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) { setLocationError("Your browser does not support location access."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        trackedHex.current = null;
        exitRefreshHex.current = null;
        setPlace({ lat: coords.latitude, lon: coords.longitude, label: "Your location · live sky", sample: false });
        setData(null);
        setReceivedAt(0);
        setLoading(true);
        setLocating(false);
      },
      () => { setLocationError("Location unavailable. Showing the live sky over Chicago."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const elapsedSeconds = receivedAt ? Math.max(0, (clockMs - receivedAt) / 1000) : 0;
  const aircraft = (data?.aircraft ?? []).map((plane) => {
    const position = estimatePosition(plane, elapsedSeconds);
    return {
      ...plane,
      lat: position.lat,
      lon: position.lon,
      distanceKm: distanceKm(place, position),
      seenSeconds: position.ageSeconds,
      estimated: position.estimated,
    };
  });
  const selectedAircraft = aircraft.find((plane) => plane.hex === data?.flight?.hex);
  const inZone = Boolean(selectedAircraft && selectedAircraft.distanceKm <= ZONE_RADIUS_KM);
  const flight = inZone ? data?.flight ?? null : null;
  useEffect(() => {
    const hex = data?.flight?.hex;
    if (hex && !inZone && !error && exitRefreshHex.current !== hex) {
      exitRefreshHex.current = hex;
      trackedHex.current = null;
      setRefreshKey((key) => key + 1);
    }
  }, [data?.flight?.hex, inZone, error]);
  const routeKnown = Boolean(flight?.origin && flight?.destination);
  const flightName = flight ? flightIdentityText(flight) : "Aircraft";
  const crossing = selectedAircraft ? zoneProgress(place, selectedAircraft) : flight?.zoneProgress ?? null;
  const progress = crossing?.percent ?? null;
  const shownDistanceKm = selectedAircraft?.distanceKm ?? flight?.distanceKm ?? 0;
  const shownAgeSeconds = selectedAircraft?.seenSeconds ?? flight?.seenSeconds ?? 0;
  const positionEstimated = Boolean(selectedAircraft?.estimated);
  const flightHeading = error ? "Live feed interrupted" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Live aircraft nearby";
  const nextAircraft = flight ? aircraft
    .filter((plane) => plane.hex !== flight.hex && plane.distanceKm <= ZONE_RADIUS_KM && plane.seenSeconds <= 90)
    .map((plane) => {
      const path = zoneProgress(place, plane);
      const speedKmPerMinute = (plane.speedKts ?? 0) * 1.852 / 60;
      const minutesToClosest = path && speedKmPerMinute > 0
        ? Math.max(0, path.remainingKm - path.crossingKm / 2) / speedKmPerMinute : null;
      return { plane, path, minutesToClosest };
    })
    .filter((candidate) => candidate.path?.motion === "approaching")
    .sort((a, b) => (a.minutesToClosest ?? Infinity) - (b.minutesToClosest ?? Infinity) || a.plane.distanceKm - b.plane.distanceKm)[0] : null;
  return <main className="app-shell live-shell">
    <header className="topbar">
      <div className="topbar-main">
        <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
        <div className="header-weather" aria-label="Current weather">
          <CloudSun size={19} strokeWidth={1.8} aria-hidden="true" />
          {data?.weather ? <>
            <strong className="header-weather-temp">{Math.round(data.weather.temperatureF)}°</strong>
            <span className="header-weather-condition">{weatherLabel(data.weather.code)}</span>
            <span className="header-weather-stat">Cloud {data.weather.cloudCover}%</span>
            <span className="header-weather-stat">Wind {Math.round(data.weather.windMph)} mph</span>
          </> : <span className="header-weather-condition">{loading ? "Loading weather…" : "Weather unavailable"}</span>}
        </div>
        <div className="topbar-right"><ModeToggle mode="live" onChange={onModeChange} /><span className="top-divider" /><span className="topbar-place"><MapPin size={15} />{place.label}</span></div>
      </div>
    </header>

    <section className={`sky-stage live-stage ${flight ? "sky-active has-flight" : "sky-empty"}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" /><div className="sky-overlay" aria-hidden="true" />
      <BoardingPassDisplay displayKey={flight ? `${flight.hex}:${flightHeading}` : "quiet"} active={Boolean(flight)}>
      {flight ? <>
        <div className="boarding-pass-main">
          <div className="boarding-pass-topline"><p className="hero-status" role="status"><span className={`signal-dot ${error ? "quiet-dot" : ""}`} /> {error ? "Feed interrupted" : "Live flight"}</p><span>OVERHEAD</span></div>
          <h1 id="hero-title" className="boarding-pass-heading"><span>{flightHeading}</span></h1>
          <FlightIdentity {...flight} />
          <div className="boarding-pass-divider" aria-hidden="true" />
          <BoardingRoute origin={flight.origin} destination={flight.destination} />
          {!routeKnown && <p className="boarding-pass-route-note">Flight path could not be confirmed</p>}
        </div>
        <BoardingPassStub callsign={flight.callsign} flightNumber={flight.flightNumber} flightIata={flight.flightIata} airline={flight.airline} aircraftType={flight.aircraftType}>
          <div className="hero-flight-details">
            <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={shownDistanceKm} />
            <p className="boarding-pass-freshness">Last reported {Math.round(shownAgeSeconds)} sec ago · {positionEstimated ? "Position estimated between reports" : "Reported position"}</p>
            <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
            {locationError && <p className="live-location-error" role="status">{locationError}</p>}
            {nextAircraft && <div className="next-aircraft-queue" aria-label="Next approaching aircraft">
              <span className="next-aircraft-label">NEXT APPROACHING</span>
              <div className="next-aircraft-main"><strong>{nextAircraft.plane.callsign || nextAircraft.plane.registration || nextAircraft.plane.hex.toUpperCase()}</strong><span>{nextAircraft.plane.originCode || "···"} → {nextAircraft.plane.destinationCode || "···"}</span></div>
              <p>{nextAircraft.plane.distanceKm.toFixed(1)} km away{nextAircraft.minutesToClosest !== null ? ` · ${nextAircraft.minutesToClosest < 1 ? "<1" : `~${Math.ceil(nextAircraft.minutesToClosest)}`} min to closest approach` : ""}</p>
            </div>}
          </div>
        </BoardingPassStub>
      </> : <>
        <div className="boarding-pass-main">
          <div className="boarding-pass-topline boarding-pass-topline-quiet"><span>OVERHEAD</span></div>
          <h1 id="hero-title" className="boarding-pass-heading"><span>A quiet sky.<br /><em>For now.</em></span></h1>
          <p className="hero-description">{error || (loading ? "Finding aircraft heading toward the 5 nautical mile zone." : `No aircraft currently heading toward ${place.sample ? "central Chicago" : "your location"} within 5 nautical miles.`)}</p>
        </div>
        <div className="boarding-pass-stub">
          <div className="boarding-pass-stub-codes">
            <div><span>SKY STATUS</span><strong>{loading && !data ? "Checking for aircraft" : error ? "Feed unavailable" : "No approaching aircraft"}</strong></div>
            <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
          </div>
          <div className="boarding-pass-stub-details">
            <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
            {locationError && <p className="live-location-error" role="status">{locationError}</p>}
            {place.sample && <p className="live-place-note">Showing real flights over Chicago until you choose your location.</p>}
          </div>
        </div>
      </>}
      </BoardingPassDisplay>
      {flight ? <div className="sky-aircraft-layer"><AircraftModel key={flight.hex} progress={progress} live /></div> : <div className="quiet-orbit" aria-hidden="true"><span /><span /><span /><i /></div>}
      {flight && <HeroProgressLine key={flight.hex} progress={progress} label={`${flightName} crossing the 5 nautical mile zone`} valueText={progress == null ? "Progress unavailable" : `${progress.toFixed(1)}% through the zone, estimated from the latest reported position and heading`} live />}
    </section>

    <div className="sky-dashboard">
      <FlightMap lat={place.lat} lon={place.lon} aircraft={aircraft} closestHex={flight?.hex ?? null} loading={loading && !data} unavailable={Boolean(error)} locationLabel={place.sample ? "Central Chicago" : "Your location"} />
      <aside className="flight-sidebar" aria-label="Live flight details"><article className="detail-panel flight-panel">
        <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3 title={flight?.callsign || undefined}>{flightName}</h3></div>
        {flight ? <><div className="airport-row"><div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unknown"}</span></div><ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" /><div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unknown"}</span></div></div>
          <div className="stat-row"><div><span>Altitude</span><strong>{flight.altitudeFt == null ? "—" : `${Math.round(flight.altitudeFt).toLocaleString()} ft`}</strong></div><div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div><div><span>Distance</span><strong>{shownDistanceKm.toFixed(1)} km</strong></div></div><p className="data-note">{routeKnown ? "Route reported by AirLabs" : "Route unavailable"} · Last report {Math.round(shownAgeSeconds)} sec ago{positionEstimated ? " · Position estimated" : ""}</p></> : <p className="empty-copy">{loading ? "Checking for nearby flights…" : error || "No approaching aircraft reported in this zone right now."}</p>}
      </article></aside>
    </div>

    <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span className="live-attribution">Data: <a href="https://airlabs.co/">AirLabs</a> · <a href="https://open-meteo.com/">Open-Meteo</a> · Map: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></span></footer>
  </main>;
}
