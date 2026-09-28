"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CloudSun, Helicopter, MapPin, Navigation2, Pause, Plane, PlaneLanding, Play, RotateCcw } from "lucide-react";
import FlightMap from "./flight-map";
import LiveSky, { type Place } from "./live-sky";
import ModeToggle from "./mode-toggle";
import { demoElapsedFractionAtProgress, demoFlights, demoPlace, demoProgressAtElapsedFraction, demoWeather, distanceFromDemoPlace, sampleDemoProfile } from "./demo-data";
import { positionAtZoneProgress, zoneProgress } from "../lib/zone-progress";
import FlightIdentity, { flightIdentityText } from "./flight-identity";
import BoardingRoute from "./boarding-route";
import { BoardingPassStats, BoardingPassStub } from "./boarding-pass-extras";
import HeroProgressLine from "./hero-progress-line";
import BoardingPassDisplay from "./boarding-pass-display";
import FlipHeading from "./flip-heading";
import AircraftModel from "./aircraft-model";
import { aircraftVisualForFlight } from "../lib/aircraft-visual";
import ModelCredits from "./model-credits";
import { preloadAircraftScenes } from "./aircraft-assets";
import HeroCloud from "./hero-cloud";
import WeatherUnitToggle from "./weather-unit-toggle";
import { formatTemperature, formatWind, type WeatherUnit } from "../lib/weather-units";

const DEMO_CROSSING_DURATION_MS = 30_000;

export default function Home() {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [place, setPlace] = useState<Place>({ lat: demoPlace.lat, lon: demoPlace.lon, label: "Houston · live sky", sample: true });
  const [weatherUnit, setWeatherUnit] = useState<WeatherUnit>("imperial");
  useEffect(() => { preloadAircraftScenes(); }, []);
  return mode === "live"
    ? <LiveSky onModeChange={setMode} place={place} onPlaceChange={setPlace} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} />
    : <DemoHome onModeChange={setMode} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} />;
}

function DemoHome({ onModeChange, weatherUnit, onWeatherUnitChange }: { onModeChange: (mode: "live" | "demo") => void; weatherUnit: WeatherUnit; onWeatherUnitChange: (unit: WeatherUnit) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"empty" | "active" | "exiting">("empty");
  const [flightRun, setFlightRun] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const pendingStartRef = useRef(false);
  const modelReadyRef = useRef(false);
  const passReadyRef = useRef(false);
  const progressRef = useRef(0);
  const elapsedRef = useRef(0);
  const selected = demoFlights.find((item) => item.id === selectedId) ?? null;
  const previewPosition = selected ? positionAtZoneProgress(demoPlace, selected.aircraft, progress) : null;
  const flight = selected ? {
    ...selected.aircraft,
    ...previewPosition,
    ...sampleDemoProfile(selected.profile, progress),
    distanceKm: previewPosition ? distanceFromDemoPlace(previewPosition.lat, previewPosition.lon) : selected.aircraft.distanceKm,
  } : null;
  const crossing = flight ? zoneProgress(demoPlace, flight) : null;
  const routeKnown = Boolean(selected?.origin && selected?.destination);
  const routeEntry = selected?.origin ?? selected?.scenario.localSegment?.entry ?? null;
  const routeExit = selected?.destination ?? selected?.scenario.localSegment?.exit ?? null;
  const mapAircraft = flight && selected ? [{ ...flight, origin: selected.origin, destination: selected.destination }] : [];
  const crossingStatus = phase === "exiting" ? "Leaving your sky" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Crossing your sky";
  const displayKey = flight && selected ? `${selected.id}:${flightRun}:${crossingStatus}` : "quiet";

  useEffect(() => {
    if (!playing || !selected) return;
    let lastTick: number | null = null;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = lastTick === null ? 50 : Math.min(now - lastTick, 100);
      lastTick = now;
      elapsedRef.current = Math.min(DEMO_CROSSING_DURATION_MS, elapsedRef.current + elapsed);
      const next = elapsedRef.current === DEMO_CROSSING_DURATION_MS
        ? 100 : demoProgressAtElapsedFraction(selected.profile, elapsedRef.current / DEMO_CROSSING_DURATION_MS);
      progressRef.current = next;
      setProgress(next);
      if (elapsedRef.current === DEMO_CROSSING_DURATION_MS) {
        setPlaying(false);
        setPhase("exiting");
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, selected, flightRun]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => {
      setSelectedId(null);
      setPhase("empty");
      progressRef.current = 0;
      elapsedRef.current = 0;
      setProgress(0);
      setPreparing(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function startWhenReady() {
    if (!pendingStartRef.current || !modelReadyRef.current || !passReadyRef.current) return;
    pendingStartRef.current = false;
    setPreparing(false);
    setPlaying(true);
  }

  function selectFlight(id: string) {
    pendingStartRef.current = true;
    modelReadyRef.current = false;
    passReadyRef.current = false;
    setPlaying(false);
    setPreparing(true);
    progressRef.current = 0;
    elapsedRef.current = 0;
    setProgress(0);
    setSelectedId(id);
    setFlightRun((run) => run + 1);
    setPhase("active");
    if (window.scrollY > 300) window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function setPreviewProgress(value: number) {
    pendingStartRef.current = false;
    setPlaying(false);
    setPreparing(false);
    progressRef.current = value;
    elapsedRef.current = selected ? demoElapsedFractionAtProgress(selected.profile, value) * DEMO_CROSSING_DURATION_MS : 0;
    setProgress(value);
    if (value === 100) setPhase("exiting");
    else if (phase === "exiting") setPhase("active");
  }

  function clearSky() {
    pendingStartRef.current = false;
    setPlaying(false);
    setPreparing(false);
    setSelectedId(null);
    progressRef.current = 0;
    elapsedRef.current = 0;
    setProgress(0);
    setPhase("empty");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
          <div className="header-weather" aria-label="Sample weather">
            <CloudSun size={19} strokeWidth={1.8} aria-hidden="true" />
            <strong className="header-weather-temp">{formatTemperature(demoWeather.temperatureF, weatherUnit)}</strong>
            <span className="header-weather-condition">Partly cloudy <small>· Sample weather</small></span>
            <span className="header-weather-stat">Cloud {demoWeather.cloudCover}%</span>
            <span className="header-weather-stat">Wind {formatWind(demoWeather.windMph, weatherUnit)}</span>
          </div>
          <div className="topbar-right">
            <ModeToggle mode="demo" onChange={onModeChange} />
            <span className="top-divider" />
            <span className="topbar-place"><MapPin size={15} />{demoPlace.label}</span>
          </div>
        </div>
      </header>

      <section className={`sky-stage sky-${phase} ${flight ? "has-flight" : ""}`} aria-labelledby="hero-title">
        <div className="sky-art" aria-hidden="true" />
        <div className="sky-overlay" aria-hidden="true" />
        {!flight && <HeroCloud />}
        <BoardingPassDisplay displayKey={displayKey} active={Boolean(flight && selected)} onDisplayed={(shownKey) => {
          if (shownKey !== displayKey) return;
          passReadyRef.current = true;
          startWhenReady();
        }}>
        <div className="boarding-pass-main">
          <FlipHeading text={flight && selected ? crossingStatus : "A quiet sky.\nFor now."} />
          {flight && selected ? <>
              <FlightIdentity {...flight} />
              <div className="boarding-pass-divider" aria-hidden="true" />
              <BoardingRoute origin={routeEntry} destination={routeExit} zoneSegment={!routeKnown} />
              {!routeKnown && <p className="boarding-pass-route-note">{selected.scenario.routeNote}</p>}
          </> : <p className="hero-description">No aircraft are inside the sample zone. Choose a simulated flight below to watch it enter, cross, and leave your sky.</p>}
        </div>
        {flight && selected ?
            <BoardingPassStub callsign={flight.callsign} aircraftType={flight.aircraftType}>
              <div className="hero-flight-details">
                <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={flight.distanceKm} />
                <div className="hero-playback">
                  <button type="button" className="zone-play" disabled={phase === "exiting" || preparing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{preparing ? "Preparing…" : playing ? "Pause" : "Resume"}</button>
                  <button type="button" className="zone-reset" onClick={() => selectFlight(selected.id)}><RotateCcw size={15} />Replay</button>
                  <span>30 sec demo crossing</span>
                </div>
              </div>
            </BoardingPassStub>
        : <div className="boarding-pass-stub">
            <div className="boarding-pass-stub-codes">
              <div><span>SKY STATUS</span><strong>No aircraft in the zone</strong></div>
              <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
            </div>
            <div className="boarding-pass-stub-details">
              <button type="button" className="primary-button" onClick={() => document.getElementById("presets-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Simulate an arrival <ArrowRight size={18} /></button>
            </div>
          </div>}
        </BoardingPassDisplay>
        {flight && selected && <div className="sky-aircraft-layer"><AircraftModel key={selected.id} progress={progress} visual={aircraftVisualForFlight(flight)} entranceRun={flightRun} onReady={() => {
          modelReadyRef.current = true;
          startWhenReady();
        }} /></div>}
        {flight && <HeroProgressLine key={`${selectedId}-${flightRun}`} progress={progress} label={`${flight.callsign || "Aircraft"} crossing the zone`} valueText={`${Math.round(progress)}%, ${crossingStatus.toLowerCase()}`} />}
      </section>

      <section className="presets-section compact-presets" aria-labelledby="presets-title">
        <div className="presets-heading"><h2 id="presets-title">Try a flight</h2><p>Three fictional flights · Select one to watch it cross your sky.</p></div>
        <div className="preset-list" role="group" aria-label="Sample flights">
          {demoFlights.map((item) => {
            const kind = aircraftVisualForFlight(item.aircraft);
            const Icon = kind === "helicopter" ? Helicopter : kind === "private" ? Plane : PlaneLanding;
            return <button key={item.id} type="button" className={`preset-button preset-${kind} ${selectedId === item.id ? "active" : ""}`} aria-pressed={selectedId === item.id} onClick={() => selectFlight(item.id)}>
              <span className="preset-icon"><Icon size={25} strokeWidth={1.65} /></span>
              <span className="preset-copy"><span className="preset-category">{kind === "airliner" ? "Commercial" : kind === "private" ? "Private" : "Rotorcraft"}</span><strong>{item.label}</strong><small>{item.description}</small></span>
              <span className="preset-action" aria-hidden="true">{selectedId === item.id ? <Check size={17} /> : <ArrowRight size={17} />}</span>
            </button>;
          })}
        </div>
      </section>

      <div className="sky-dashboard">
      <FlightMap lat={demoPlace.lat} lon={demoPlace.lon} aircraft={mapAircraft} closestHex={flight?.hex ?? null} loading={false} unavailable={false} demo showDetails={false} exiting={phase === "exiting"} onSelect={(hex) => {
        const match = demoFlights.find((item) => item.aircraft.hex === hex);
        if (match) selectFlight(match.id);
      }} />

        <aside className={`flight-sidebar info-${phase}`} aria-label="Flight details and preview controls">
          <article className="detail-panel flight-panel">
            <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3 title={flight?.callsign || undefined}>{flight ? flightIdentityText(flight) : "Flight details"}</h3></div>
            {flight && selected ? <>
            <div className="airport-row">
              <div><strong className="airport-code">{routeEntry?.code ?? "···"}</strong><span className="airport-city">{routeEntry?.city ?? "Entry unknown"}</span></div>
              <ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" />
              <div><strong className="airport-code">{routeExit?.code ?? "···"}</strong><span className="airport-city">{routeExit?.city ?? "Exit unknown"}</span></div>
            </div>
            <div className="stat-row">
              <div><span>Altitude</span><strong>{flight.altitudeFt.toLocaleString()} ft</strong></div>
              <div><span>Ground speed</span><strong>{flight.speedKts?.toLocaleString()} kt</strong></div>
              <div><span>Distance</span><strong>{flight.distanceKm.toFixed(1)} km</strong></div>
            </div>
            <p className="data-note">{selected.scenario.routeNote}</p>
            </> : <p className="empty-copy">No flight details yet. Start a sample flight to see its journey.</p>}
          </article>
          {flight && <div className="map-preview-controls">
            <label className="zone-scrub">Preview position <input type="range" min="0" max="100" value={progress} onChange={(event) => setPreviewProgress(Number(event.target.value))} /></label>
            <div><button type="button" className="zone-reset" onClick={() => setPreviewProgress(0)}><RotateCcw size={15} />Reset to entry</button><button type="button" className="zone-clear" onClick={clearSky}>Clear sky</button></div>
          </div>}
        </aside>
      </div>

      <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><WeatherUnitToggle value={weatherUnit} onChange={onWeatherUnitChange} /><span>Map: OpenStreetMap</span><ModelCredits /></footer>
    </main>
  );
}
