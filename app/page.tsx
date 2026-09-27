"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, MapPin, Navigation2, Pause, Play, RotateCcw } from "lucide-react";
import FlightMap from "./flight-map";
import LiveSky from "./live-sky";
import ModeToggle from "./mode-toggle";
import { demoFlights, demoPlace, demoWeather, distanceFromDemoPlace } from "./demo-data";
import { positionAtZoneProgress, zoneProgress, ZONE_RADIUS_KM } from "../lib/zone-progress";
import FlightIdentity, { flightIdentityText } from "./flight-identity";
import BoardingRoute from "./boarding-route";
import { BoardingPassStats, BoardingPassStub } from "./boarding-pass-extras";
import HeroProgressLine from "./hero-progress-line";
import BoardingPassDisplay from "./boarding-pass-display";

function aircraftImage(type: string) {
  if (/^(B7[4-8]|A3[0-2]|BCS)/.test(type)) return "/aircraft/narrowbody.png";
  if (/^(B7[6-9]|A3[3-5]|A38)/.test(type)) return "/aircraft/widebody.png";
  return "/aircraft/regional.png";
}

export default function Home() {
  const [mode, setMode] = useState<"live" | "sandbox">("live");
  return mode === "live" ? <LiveSky onModeChange={setMode} /> : <SandboxHome onModeChange={setMode} />;
}

function SandboxHome({ onModeChange }: { onModeChange: (mode: "live" | "sandbox") => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"empty" | "active" | "exiting">("empty");
  const [flightRun, setFlightRun] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progressRef = useRef(0);
  const selected = demoFlights.find((item) => item.id === selectedId) ?? null;
  const previewPosition = selected ? positionAtZoneProgress(demoPlace, selected.aircraft, progress) : null;
  const flight = selected ? {
    ...selected.aircraft,
    ...previewPosition,
    distanceKm: previewPosition ? distanceFromDemoPlace(previewPosition.lat, previewPosition.lon) : selected.aircraft.distanceKm,
  } : null;
  const crossing = flight ? zoneProgress(demoPlace, flight) : null;
  const routeKnown = Boolean(selected?.origin && selected?.destination);
  const mapAircraft = flight ? [flight] : [];
  const pathLength = selected ? zoneProgress(demoPlace, selected.aircraft)?.crossingKm ?? ZONE_RADIUS_KM * 2 : ZONE_RADIUS_KM * 2;
  const crossingDurationMs = pathLength / ((selected?.aircraft.speedKts ?? 200) * 1.852) * 3_600_000 / 30;
  const aircraftScale = .88 + .24 * Math.sin(Math.PI * progress / 100) ** 2;
  const crossingStatus = phase === "exiting" ? "Leaving your sky" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Crossing your sky";

  useEffect(() => {
    if (!playing) return;
    let lastTick = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(now - lastTick, 100);
      lastTick = now;
      const next = Math.min(100, progressRef.current + elapsed / crossingDurationMs * 100);
      progressRef.current = next;
      setProgress(next);
      if (next === 100) {
        setPlaying(false);
        setPhase("exiting");
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing, crossingDurationMs, flightRun]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = window.setTimeout(() => {
      setSelectedId(null);
      setPhase("empty");
      progressRef.current = 0;
      setProgress(0);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function selectFlight(id: string) {
    setPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    setSelectedId(id);
    setFlightRun((run) => run + 1);
    setPhase("active");
    setPlaying(true);
    if (window.scrollY > 300) window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function setPreviewProgress(value: number) {
    setPlaying(false);
    progressRef.current = value;
    setProgress(value);
    if (value === 100) setPhase("exiting");
    else if (phase === "exiting") setPhase("active");
  }

  function clearSky() {
    setPlaying(false);
    setSelectedId(null);
    progressRef.current = 0;
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
            <strong className="header-weather-temp">{demoWeather.temperatureF}°</strong>
            <span className="header-weather-condition">Partly cloudy <small>· Sample weather</small></span>
            <span className="header-weather-stat">Cloud {demoWeather.cloudCover}%</span>
            <span className="header-weather-stat">Wind {demoWeather.windMph} mph</span>
          </div>
          <div className="topbar-right">
            <ModeToggle mode="sandbox" onChange={onModeChange} />
            <span className="top-divider" />
            <span className="topbar-place"><MapPin size={15} />{demoPlace.label}</span>
          </div>
        </div>
      </header>

      <section className={`sky-stage sky-${phase} ${flight ? "has-flight" : ""}`} aria-labelledby="hero-title">
        <div className="sky-art" aria-hidden="true" />
        <div className="sky-overlay" aria-hidden="true" />
        <BoardingPassDisplay displayKey={selected?.id ?? "quiet"} active={Boolean(flight && selected)}>
        {flight && selected ? <>
            <div className="boarding-pass-main">
              <div className="boarding-pass-topline"><span>OVERHEAD</span></div>
              <h1 id="hero-title" className="boarding-pass-heading">{crossingStatus}</h1>
              <FlightIdentity {...flight} />
              <div className="boarding-pass-divider" aria-hidden="true" />
              <BoardingRoute origin={selected.origin} destination={selected.destination} />
              {!routeKnown && <p className="boarding-pass-route-note">No published route in this scenario</p>}
            </div>
            <BoardingPassStub callsign={flight.callsign} aircraftType={flight.aircraftType}>
              <div className="hero-flight-details">
                <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={flight.distanceKm} />
                <div className="hero-playback">
                  <button type="button" className="zone-play" disabled={phase === "exiting"} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : "Resume"}</button>
                  <button type="button" className="zone-reset" onClick={() => selectFlight(selected.id)}><RotateCcw size={15} />Replay</button>
                  <span>30× speed · {Math.round(crossingDurationMs / 1000)} sec crossing</span>
                </div>
              </div>
            </BoardingPassStub>
        </> : <>
          <div className="boarding-pass-main">
            <div className="boarding-pass-topline"><span>OVERHEAD</span></div>
            <p className="hero-status"><span className="signal-dot quiet-dot" /> Waiting for a plane</p>
            <h1 id="hero-title" className="boarding-pass-heading">A quiet sky.<br /><em>For now.</em></h1>
            <p className="hero-description">No aircraft are inside the sample zone. Choose a simulated flight below to watch it enter, cross, and leave your sky.</p>
          </div>
          <div className="boarding-pass-stub">
            <div className="boarding-pass-stub-codes">
              <div><span>SKY STATUS</span><strong>No aircraft in the zone</strong></div>
              <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
            </div>
            <div className="boarding-pass-stub-details">
              <button type="button" className="primary-button" onClick={() => document.getElementById("presets-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Simulate an arrival <ArrowRight size={18} /></button>
            </div>
          </div>
        </>}
        </BoardingPassDisplay>
        {flight && selected && <div className="hero-visual-column">
          <div className="aircraft-scene" aria-hidden="true">
            <div className="aircraft-wrap" key={`aircraft-${selected.id}-${flightRun}`} style={{ left: `${40 + progress * .2}%` }}>
              <img src={aircraftImage(flight.aircraftType ?? "")} alt="" className="aircraft-image" style={{ transform: `scale(${aircraftScale})` }} />
            </div>
          </div>
        </div>}
        {!flight && <div className="quiet-orbit" aria-hidden="true"><span /><span /><span /><i /></div>}
        {flight && <HeroProgressLine key={`${selectedId}-${flightRun}`} progress={progress} label={`${flight.callsign || "Aircraft"} crossing the zone`} valueText={`${Math.round(progress)}%, ${crossingStatus.toLowerCase()}`} />}
      </section>

      <section className="presets-section compact-presets" aria-labelledby="presets-title">
        <div className="presets-heading"><h2 id="presets-title">Try a flight</h2><p>Fictional flights · Choose a scenario to start.</p></div>
        <div className="preset-list" role="group" aria-label="Sample flights">
          {demoFlights.map((item) => (
            <button key={item.id} type="button" className={`preset-button ${selectedId === item.id ? "active" : ""}`} aria-pressed={selectedId === item.id} onClick={() => selectFlight(item.id)}>
              <span className="preset-icon"><Navigation2 size={18} /></span>
              <span><strong>{item.label}</strong><small title={item.aircraft.callsign || undefined}>{flightIdentityText(item.aircraft)}</small></span>
            </button>
          ))}
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
              <div><strong className="airport-code">{selected.origin?.code ?? "···"}</strong><span className="airport-city">{selected.origin?.city ?? "Local departure"}</span></div>
              <ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" />
              <div><strong className="airport-code">{selected.destination?.code ?? "···"}</strong><span className="airport-city">{selected.destination?.city ?? "Destination not listed"}</span></div>
            </div>
            <div className="stat-row">
              <div><span>Altitude</span><strong>{flight.altitudeFt.toLocaleString()} ft</strong></div>
              <div><span>Ground speed</span><strong>{flight.speedKts?.toLocaleString()} kt</strong></div>
              <div><span>Distance</span><strong>{flight.distanceKm.toFixed(1)} km</strong></div>
            </div>
            <p className="data-note">{routeKnown ? "Illustrative route" : "No route in this scenario"}</p>
            </> : <p className="empty-copy">No flight details yet. Start a sample flight to see its journey.</p>}
          </article>
          {flight && <div className="map-preview-controls">
            <label className="zone-scrub">Preview position <input type="range" min="0" max="100" value={progress} onChange={(event) => setPreviewProgress(Number(event.target.value))} /></label>
            <div><button type="button" className="zone-reset" onClick={() => setPreviewProgress(0)}><RotateCcw size={15} />Reset to entry</button><button type="button" className="zone-clear" onClick={clearSky}>Clear sky</button></div>
          </div>}
        </aside>
      </div>

      <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span>Map: OpenStreetMap</span></footer>
    </main>
  );
}
