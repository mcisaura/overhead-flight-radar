"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CloudSun, Helicopter, Navigation2, Pause, Plane, PlaneLanding, Play, RotateCcw } from "lucide-react";
import AircraftModel from "../../aircraft-model";
import BoardingPassDisplay from "../../boarding-pass-display";
import BoardingRoute from "../../boarding-route";
import { BoardingPassStats, BoardingPassStub } from "../../boarding-pass-extras";
import { demoElapsedFractionAtProgress, demoProgressAtElapsedFraction, sampleDemoProfile } from "../../demo-data";
import FlightIdentity from "../../flight-identity";
import FlightMap from "../../flight-map";
import FlipHeading from "../../flip-heading";
import HeroCloud from "../../hero-cloud";
import HeroProgressLine from "../../hero-progress-line";
import ModelCredits from "../../model-credits";
import WeatherUnitToggle from "../../weather-unit-toggle";
import { preloadAircraftScenes } from "../../aircraft-assets";
import { aircraftVisualForFlight } from "../../../lib/aircraft-visual";
import { positionAtZoneProgress, zoneProgress } from "../../../lib/zone-progress";
import { formatTemperature, formatWind, type WeatherUnit } from "../../../lib/weather-units";
import { distanceFromHouston, houstonFlights, houstonPlace, houstonWeather } from "./houston-data";
import "./houston.css";

const CROSSING_DURATION_MS = 30_000;

export default function HoustonConcept() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"empty" | "active" | "exiting">("empty");
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [weatherUnit, setWeatherUnit] = useState<WeatherUnit>("imperial");
  const pendingStart = useRef(false);
  const modelReady = useRef(false);
  const passReady = useRef(false);
  const elapsed = useRef(0);

  const selected = houstonFlights.find((item) => item.id === selectedId) ?? null;
  const position = selected ? positionAtZoneProgress(houstonPlace, selected.aircraft, progress) : null;
  const flight = selected ? {
    ...selected.aircraft,
    ...position,
    ...sampleDemoProfile(selected.profile, progress),
    distanceKm: position ? distanceFromHouston(position.lat, position.lon) : selected.aircraft.distanceKm,
  } : null;
  const crossing = flight ? zoneProgress(houstonPlace, flight) : null;
  const routeKnown = Boolean(selected?.origin && selected?.destination);
  const routeEntry = selected?.origin ?? selected?.localSegment?.entry ?? null;
  const routeExit = selected?.destination ?? selected?.localSegment?.exit ?? null;
  const heading = phase === "exiting" ? "Leaving Houston" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Crossing Houston";
  const displayKey = flight && selected ? `${selected.id}:${run}:${heading}` : "quiet";
  const mapAircraft = flight && selected ? [{ ...flight, origin: selected.origin, destination: selected.destination }] : [];

  useEffect(() => { preloadAircraftScenes(); }, []);

  useEffect(() => {
    if (!playing || !selected) return;
    let lastTick: number | null = null;
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current = Math.min(CROSSING_DURATION_MS, elapsed.current + (lastTick === null ? 50 : Math.min(now - lastTick, 100)));
      lastTick = now;
      setProgress(elapsed.current === CROSSING_DURATION_MS ? 100 : demoProgressAtElapsedFraction(selected.profile, elapsed.current / CROSSING_DURATION_MS));
      if (elapsed.current === CROSSING_DURATION_MS) {
        setPlaying(false);
        setPhase("exiting");
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, selected, run]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => {
      setSelectedId(null);
      setPhase("empty");
      setProgress(0);
      setPreparing(false);
      elapsed.current = 0;
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function startWhenReady() {
    if (!pendingStart.current || !modelReady.current || !passReady.current) return;
    pendingStart.current = false;
    setPreparing(false);
    setPlaying(true);
  }

  function chooseFlight(id: string) {
    pendingStart.current = true;
    modelReady.current = false;
    passReady.current = false;
    elapsed.current = 0;
    setPlaying(false);
    setPreparing(true);
    setProgress(0);
    setSelectedId(id);
    setRun((value) => value + 1);
    setPhase("active");
    if (window.scrollY > 300) window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function preview(value: number) {
    pendingStart.current = false;
    setPlaying(false);
    setPreparing(false);
    elapsed.current = selected ? demoElapsedFractionAtProgress(selected.profile, value) * CROSSING_DURATION_MS : 0;
    setProgress(value);
    setPhase(value === 100 ? "exiting" : "active");
  }

  function clearSky() {
    pendingStart.current = false;
    setPlaying(false);
    setPreparing(false);
    setSelectedId(null);
    setProgress(0);
    setPhase("empty");
    elapsed.current = 0;
  }

  return <main className="app-shell houston-concept">
    <header className="houston-topbar">
      <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
      <div className="houston-topbar-center"><span>CONCEPT 02</span><strong>HOUSTON / TX</strong><span>29.7604° N · 95.3698° W</span></div>
      <Link className="houston-back" href="/"><ArrowLeft size={16} /> Back to Overhead</Link>
    </header>

    <section className={`sky-stage houston-stage sky-${phase} ${flight ? "has-flight" : ""}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" />
      <div className="sky-overlay" aria-hidden="true" />
      <div className="houston-watermark" aria-hidden="true">HOUSTON</div>
      <div className="houston-weather" aria-label="Sample Houston weather"><CloudSun size={20} /><strong>{formatTemperature(houstonWeather.temperatureF, weatherUnit)}</strong><span>Partly cloudy · sample weather<br />Cloud {houstonWeather.cloudCover}% · Wind {formatWind(houstonWeather.windMph, weatherUnit)}</span></div>
      {!flight && <HeroCloud />}
      <BoardingPassDisplay displayKey={displayKey} active={Boolean(flight)} onDisplayed={(shownKey) => {
        if (shownKey !== displayKey) return;
        passReady.current = true;
        startWhenReady();
      }}>
        <div className="boarding-pass-main">
          <FlipHeading text={flight ? heading : "A quiet sky.\nFor now."} />
          {flight && selected ? <>
            <FlightIdentity {...flight} />
            <div className="boarding-pass-divider" aria-hidden="true" />
            <BoardingRoute origin={routeEntry} destination={routeExit} zoneSegment={!routeKnown} />
            {!routeKnown && <p className="boarding-pass-route-note">{selected.routeNote}</p>}
          </> : <p className="hero-description">Three fictional flights are ready to cross the sky above downtown Houston. Choose one below to begin.</p>}
        </div>
        {flight && selected ? <BoardingPassStub callsign={flight.callsign} aircraftType={flight.aircraftType}>
          <div className="hero-flight-details">
            <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={flight.distanceKm} />
            <div className="hero-playback">
              <button type="button" className="zone-play" disabled={phase === "exiting" || preparing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{preparing ? "Preparing…" : playing ? "Pause" : "Resume"}</button>
              <button type="button" className="zone-reset" onClick={() => chooseFlight(selected.id)}><RotateCcw size={15} />Replay</button>
              <span>30 sec crossing</span>
            </div>
          </div>
        </BoardingPassStub> : <div className="boarding-pass-stub">
          <div className="boarding-pass-stub-codes"><div><span>LOCATION</span><strong>Houston, Texas</strong></div><div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div></div>
          <div className="boarding-pass-stub-details"><button type="button" className="primary-button" onClick={() => document.getElementById("houston-flights")?.scrollIntoView({ behavior: "smooth" })}>Choose a flight <ArrowRight size={17} /></button></div>
        </div>}
      </BoardingPassDisplay>
      {flight && selected && <div className="sky-aircraft-layer"><AircraftModel key={selected.id} progress={progress} visual={aircraftVisualForFlight(flight)} entranceRun={run} onReady={() => {
        modelReady.current = true;
        startWhenReady();
      }} /></div>}
      {flight && <HeroProgressLine key={`${selectedId}-${run}`} progress={progress} label={`${flight.callsign || "Aircraft"} crossing Houston`} valueText={`${Math.round(progress)}%, ${heading.toLowerCase()}`} />}
      <div className="houston-hero-index" aria-hidden="true"><span>HOU / 001</span><span>THE CITY FROM ABOVE</span></div>
    </section>

    <section className="houston-scenarios" aria-labelledby="houston-flights">
      <div className="houston-section-heading"><div><span className="houston-eyebrow">THREE WAYS ACROSS THE CITY</span><h2 id="houston-flights">Choose a Houston flight</h2></div><p>Fictional routes and sample conditions. Each crossing takes 30 seconds.</p></div>
      <div className="houston-flight-grid">
        {houstonFlights.map((item, index) => {
          const kind = aircraftVisualForFlight(item.aircraft);
          const Icon = kind === "helicopter" ? Helicopter : kind === "private" ? Plane : PlaneLanding;
          return <button key={item.id} type="button" className={`houston-flight-card ${selectedId === item.id ? "is-active" : ""}`} aria-pressed={selectedId === item.id} onClick={() => chooseFlight(item.id)}>
            <span className="houston-flight-number">0{index + 1} / {item.tag}</span>
            <span className="houston-flight-icon"><Icon size={31} strokeWidth={1.5} /></span>
            <strong>{item.label}</strong><small>{item.description}</small>
            <span className="houston-flight-cta">Watch crossing <ArrowRight size={16} /></span>
          </button>;
        })}
      </div>
    </section>

    <section className="houston-lower" aria-label="Houston route map and flight details">
      <div className="houston-map-wrap"><div className="houston-panel-heading"><span className="houston-eyebrow">GROUND REFERENCE</span><h2>Downtown observation zone</h2></div><FlightMap lat={houstonPlace.lat} lon={houstonPlace.lon} aircraft={mapAircraft} closestHex={flight?.hex ?? null} loading={false} unavailable={false} demo showDetails={false} locationLabel="Downtown Houston" exiting={phase === "exiting"} /></div>
      <aside className="houston-detail-panel"><span className="houston-eyebrow">FLIGHT TELEMETRY</span><h2>{selected?.label ?? "The next crossing"}</h2>
        {flight && selected ? <><p>{selected.routeNote}</p><div className="houston-detail-route"><div><span>FROM</span><strong>{routeEntry?.code ?? "—"}</strong><small>{routeEntry?.city ?? "Unknown"}</small></div><ArrowRight size={22} /><div><span>TO</span><strong>{routeExit?.code ?? "—"}</strong><small>{routeExit?.city ?? "Unknown"}</small></div></div><div className="houston-detail-stats"><div><span>ALTITUDE</span><strong>{Math.round(flight.altitudeFt).toLocaleString()} ft</strong></div><div><span>GROUND SPEED</span><strong>{Math.round(flight.speedKts)} kt</strong></div><div><span>DISTANCE</span><strong>{flight.distanceKm.toFixed(1)} km</strong></div></div><label className="houston-scrub">Preview position <input type="range" min="0" max="100" value={progress} onChange={(event) => preview(Number(event.target.value))} /></label><div className="houston-detail-actions"><button type="button" onClick={() => preview(0)}>Reset to entry</button><button type="button" onClick={clearSky}>Clear sky</button></div></> : <p>Select a route above to see its position and flight details here.</p>}
      </aside>
    </section>

    <footer className="houston-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span>Houston concept · fictional flight plans and weather</span><WeatherUnitToggle value={weatherUnit} onChange={setWeatherUnit} /><span>Map: OpenStreetMap</span><ModelCredits /></footer>
  </main>;
}
