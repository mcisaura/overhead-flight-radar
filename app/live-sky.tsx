"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudSun, LocateFixed, MapPin, Navigation2, RefreshCw } from "lucide-react";
import FlightMap, { type MapAircraft } from "./flight-map";
import ModeToggle from "./mode-toggle";
import { distanceKm, estimatePosition } from "../lib/flight-estimate";
import { ZONE_RADIUS_KM, zoneProgress } from "../lib/zone-progress";
import FlightIdentity, { flightIdentityText } from "./flight-identity";
import BoardingRoute from "./boarding-route";
import { BoardingPassStats, BoardingPassStub } from "./boarding-pass-extras";
import type { AirlineIdentity } from "../lib/flight-display";
import HeroProgressLine from "./hero-progress-line";
import BoardingPassDisplay from "./boarding-pass-display";
import FlipHeading from "./flip-heading";
import AircraftModel from "./aircraft-model";
import { aircraftVisualForFlight } from "../lib/aircraft-visual";
import ModelCredits from "./model-credits";
import WeatherUnitToggle from "./weather-unit-toggle";
import { formatTemperature, formatWind, type WeatherUnit } from "../lib/weather-units";
import HeroCloud from "./hero-cloud";

export type Place = { lat: number; lon: number; label: string; sample: boolean };
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
const noAircraft: MapAircraft[] = [];

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

export default function LiveSky({ onModeChange, place, onPlaceChange, weatherUnit, onWeatherUnitChange }: { onModeChange: (mode: "live" | "demo") => void; place: Place; onPlaceChange: (place: Place) => void; weatherUnit: WeatherUnit; onWeatherUnitChange: (unit: WeatherUnit) => void }) {
  const [data, setData] = useState<SkyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clockMs, setClockMs] = useState(0);
  const exitRefreshHex = useRef<string | null>(null);
  const takeoverRefreshHex = useRef<string | null>(null);

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
        const response = await fetch(`/api/sky?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Live sky is temporarily unavailable.");
        const result = await response.json() as SkyResponse;
        if (!active || requestId !== latestRequest) return;
        const now = Date.now();
        if (exitRefreshHex.current !== result.flight?.hex) exitRefreshHex.current = null;
        if (takeoverRefreshHex.current === result.flight?.hex) takeoverRefreshHex.current = null;
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
        exitRefreshHex.current = null;
        takeoverRefreshHex.current = null;
        onPlaceChange({ lat: coords.latitude, lon: coords.longitude, label: "Your location · live sky", sample: false });
        setData(null);
        setReceivedAt(0);
        setLoading(true);
        setLocating(false);
      },
      () => { setLocationError("Location unavailable. Keeping the current live sky."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onPlaceChange]);

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
  const closestAircraft = aircraft
    .filter((plane) => plane.distanceKm <= ZONE_RADIUS_KM && plane.seenSeconds <= 60)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.hex.localeCompare(b.hex))[0];
  useEffect(() => {
    const hex = data?.flight?.hex;
    if (hex && !inZone && !error && exitRefreshHex.current !== hex) {
      exitRefreshHex.current = hex;
      setRefreshKey((key) => key + 1);
    }
  }, [data?.flight?.hex, inZone, error]);
  useEffect(() => {
    const closestHex = closestAircraft?.hex;
    if (!flight || !closestHex || closestHex === flight.hex) {
      takeoverRefreshHex.current = null;
      return;
    }
    if (!error && takeoverRefreshHex.current !== closestHex) {
      takeoverRefreshHex.current = closestHex;
      setRefreshKey((key) => key + 1);
    }
  }, [flight, closestAircraft?.hex, error]);
  const routeKnown = Boolean(flight?.origin && flight?.destination);
  const flightName = flight ? flightIdentityText(flight) : "Aircraft";
  const crossing = selectedAircraft ? zoneProgress(place, selectedAircraft) : flight?.zoneProgress ?? null;
  const progress = crossing?.percent ?? null;
  const shownDistanceKm = selectedAircraft?.distanceKm ?? flight?.distanceKm ?? 0;
  const shownAgeSeconds = selectedAircraft?.seenSeconds ?? flight?.seenSeconds ?? 0;
  const positionEstimated = Boolean(selectedAircraft?.estimated);
  const flightHeading = error ? "Live feed interrupted" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Live aircraft nearby";
  const liveRouteSummary = flight?.origin && flight.destination
    ? `AirLabs lists this flight from ${flight.origin.city} to ${flight.destination.city}.`
    : "Route endpoints are unavailable for this aircraft.";
  const minutesToZoneExit = crossing && selectedAircraft?.speedKts && selectedAircraft.speedKts > 0
    ? crossing.remainingKm / (selectedAircraft.speedKts * 1.852 / 60) : null;
  const nextAircraft = flight ? aircraft
    .filter((plane) => plane.hex !== flight.hex && plane.distanceKm <= ZONE_RADIUS_KM && plane.seenSeconds <= 60)
    .sort((a, b) => a.distanceKm - b.distanceKm || a.hex.localeCompare(b.hex))[0] : null;
  return <main className="app-shell live-shell">
    <header className="topbar">
      <div className="topbar-main">
        <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
        <div className="header-weather" aria-label="Current weather">
          <CloudSun size={19} strokeWidth={1.8} aria-hidden="true" />
          {data?.weather ? <>
            <strong className="header-weather-temp">{formatTemperature(data.weather.temperatureF, weatherUnit)}</strong>
            <span className="header-weather-condition">{weatherLabel(data.weather.code)}</span>
            <span className="header-weather-stat">Cloud {data.weather.cloudCover}%</span>
            <span className="header-weather-stat">Wind {formatWind(data.weather.windMph, weatherUnit)}</span>
          </> : <span className="header-weather-condition">{loading ? "Loading weather…" : "Weather unavailable"}</span>}
        </div>
        <div className="topbar-right"><ModeToggle mode="live" onChange={onModeChange} /><span className="top-divider" /><span className="topbar-place"><MapPin size={15} />{place.label}</span></div>
      </div>
    </header>

    <section className={`sky-stage live-stage ${flight ? "sky-active has-flight" : "sky-empty"}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" /><div className="sky-overlay" aria-hidden="true" />
      {!flight && <HeroCloud />}
      <BoardingPassDisplay displayKey={flight ? `${flight.hex}:${flightHeading}` : "quiet"} active={Boolean(flight)}>
      <div className="boarding-pass-main">
        <FlipHeading text={flight ? flightHeading : "A quiet sky.\nFor now."} />
        {flight ? <>
          <FlightIdentity {...flight} />
          <div className="boarding-pass-divider" aria-hidden="true" />
          <BoardingRoute origin={flight.origin} destination={flight.destination} />
          {!routeKnown && <p className="boarding-pass-route-note">Flight path could not be confirmed</p>}
        </> : <p className="hero-description">{error || (loading ? "Finding aircraft in the 5 nautical mile zone." : `No aircraft currently reported within 5 nautical miles of ${place.sample ? "central Chicago" : "your location"}.`)}</p>}
      </div>
      {flight ?
        <BoardingPassStub callsign={flight.callsign} flightNumber={flight.flightNumber} flightIata={flight.flightIata} airline={flight.airline} aircraftType={flight.aircraftType}>
          <div className="hero-flight-details">
            <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={shownDistanceKm} />
            <p className="boarding-pass-freshness">Last reported {Math.round(shownAgeSeconds)} sec ago · {positionEstimated ? "Position estimated between reports" : "Reported position"}</p>
            <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
            {locationError && <p className="live-location-error" role="status">{locationError}</p>}
            {nextAircraft && <div className="next-aircraft-queue" aria-label="Next closest aircraft">
              <span className="next-aircraft-label">NEXT CLOSEST</span>
              <div className="next-aircraft-main"><strong>{nextAircraft.callsign || nextAircraft.registration || nextAircraft.hex.toUpperCase()}</strong><span>{nextAircraft.originCode || "···"} → {nextAircraft.destinationCode || "···"}</span></div>
              <p>{nextAircraft.distanceKm.toFixed(1)} km away · Takes over if closer</p>
            </div>}
          </div>
        </BoardingPassStub>
      : <div className="boarding-pass-stub">
          <div className="boarding-pass-stub-codes">
            <div><span>SKY STATUS</span><strong>{loading && !data ? "Checking for aircraft" : error ? "Feed unavailable" : "No nearby aircraft"}</strong></div>
            <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
          </div>
          <div className="boarding-pass-stub-details">
            <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
            {locationError && <p className="live-location-error" role="status">{locationError}</p>}
            {place.sample && <p className="live-place-note">Showing real flights over Chicago until you choose your location.</p>}
          </div>
        </div>}
      </BoardingPassDisplay>
      {flight && <div className="sky-aircraft-layer"><AircraftModel key={`${flight.hex}-${aircraftVisualForFlight(flight)}`} progress={progress} visual={aircraftVisualForFlight(flight)} live /></div>}
      {flight && <HeroProgressLine key={flight.hex} progress={progress} label={`${flightName} crossing the 5 nautical mile zone`} valueText={progress == null ? "Progress unavailable" : `${progress.toFixed(1)}% through the zone, estimated from the latest reported position and heading`} live />}
    </section>

    <div className="sky-dashboard">
      <FlightMap lat={place.lat} lon={place.lon} aircraft={aircraft} routeAircraft={data?.aircraft ?? noAircraft} closestHex={flight?.hex ?? null} loading={loading && !data} unavailable={Boolean(error)} locationLabel={place.sample ? "Central Chicago" : "Your location"} />
      <aside className="flight-sidebar" aria-label="Live flight details"><article className="detail-panel flight-panel">
        <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3 title={flight?.callsign || undefined}>{flightName}</h3></div>
        {flight ? <><div className="airport-row"><div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unknown"}</span></div><ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" /><div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unknown"}</span></div></div>
          <div className="stat-row"><div><span>Altitude</span><strong>{flight.altitudeFt == null ? "—" : `${Math.round(flight.altitudeFt).toLocaleString()} ft`}</strong></div><div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div><div><span>Distance</span><strong>{shownDistanceKm.toFixed(1)} km</strong></div></div>
          <p className="data-note">{routeKnown ? "Route reported by AirLabs" : "Route unavailable"} · Last report {Math.round(shownAgeSeconds)} sec ago{positionEstimated ? " · Position estimated" : ""}</p>
          <div className="scenario-brief">
            <span className="scenario-brief-label">FLIGHT BRIEF</span>
            <h4>{crossing?.motion === "approaching" ? "Before closest pass" : crossing?.motion === "leaving" ? "After closest pass" : "Aircraft nearby"}</h4>
            <p>{liveRouteSummary}</p>
            <p className="scenario-brief-moment">{error ? "The live feed is interrupted; these details may be stale." : crossing ? "Closest pass and exit time are projections from the latest reported heading and speed." : "A reported heading is needed to project this aircraft’s path through the zone."}</p>
            <dl className="scenario-path-facts">
              <div><dt>Heading</dt><dd>{selectedAircraft?.heading == null ? "—" : `${Math.round(selectedAircraft.heading)}°`}</dd></div>
              <div><dt>Closest pass</dt><dd>{crossing ? `~${crossing.closestKm.toFixed(1)} km` : "—"}</dd></div>
              <div><dt>To zone exit</dt><dd>{minutesToZoneExit == null ? "—" : `~${Math.max(0.1, minutesToZoneExit).toFixed(1)} min`}</dd></div>
            </dl>
          </div></> : <p className="empty-copy">{loading ? "Checking for nearby flights…" : error || "No aircraft reported in this zone right now."}</p>}
      </article></aside>
    </div>

    <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><Link className="concept-link" href="/concept/houston">Houston concept <ArrowRight size={15} /></Link><WeatherUnitToggle value={weatherUnit} onChange={onWeatherUnitChange} /><span className="live-attribution">Data: <a href="https://airlabs.co/">AirLabs</a> · <a href="https://open-meteo.com/">Open-Meteo</a> · Map: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></span><ModelCredits /></footer>
  </main>;
}
