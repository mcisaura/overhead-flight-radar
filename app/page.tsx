"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, MapPin, Navigation2, Pause, Play, RotateCcw, Wind } from "lucide-react";
import FlightMap from "./flight-map";
import LiveSky from "./live-sky";
import ModeToggle from "./mode-toggle";
import { demoFlights, demoPlace, demoWeather, distanceFromDemoPlace } from "./demo-data";
import { positionAtZoneProgress, zoneProgress } from "../lib/zone-progress";

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
  const pathLength = selected ? zoneProgress(demoPlace, selected.aircraft)?.crossingKm ?? 74.08 : 74.08;
  const crossingDurationMs = pathLength / ((selected?.aircraft.speedKts ?? 200) * 1.852) * 3_600_000 / 30;
  const closestMoment = phase === "active" && progress >= 43 && progress <= 57;
  const closestCardEnd = Math.max(57, 43 + 5_000 / crossingDurationMs * 100);
  const showClosestCard = phase === "active" && progress >= 43 && progress <= closestCardEnd;
  const directlyOverhead = (crossing?.closestKm ?? Infinity) <= 1;
  const aircraftScale = .88 + .24 * Math.sin(Math.PI * progress / 100) ** 2;
  const crossingStatus = phase === "exiting" ? `Goodbye, ${flight?.callsign ?? "plane"}.` : progress >= 90 ? "Leaving your sky" : progress < 10 ? "Entering your sky" : closestMoment ? "Look up now" : "Crossing your sky";

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
        <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
        <div className="topbar-right">
          <ModeToggle mode="sandbox" onChange={onModeChange} />
          <span className="top-divider" />
          <span className="topbar-place"><MapPin size={15} />{demoPlace.label}</span>
        </div>
      </header>

      <section className={`sky-stage sky-${phase}`} aria-labelledby="hero-title">
        <div className="sky-art" aria-hidden="true" />
        <div className="sky-overlay" aria-hidden="true" />
        {flight && selected ? <>
          <div className="hero-inner hero-flight" key={`flight-${selected.id}-${flightRun}`}>
            <p className="hero-status" role="status"><span className="signal-dot" /> {crossingStatus}</p>
            <h1 id="hero-title">A plane is<br /><em>passing by.</em></h1>
            <div className="hero-flight-identity"><strong>{flight.callsign}</strong><span>{flight.aircraftType || "Aircraft"}</span></div>
            <p className="hero-route">{routeKnown ? <>{selected.origin!.code}<ArrowRight size={16} aria-hidden="true" />{selected.destination!.code}<span>{selected.origin!.city} to {selected.destination!.city}</span></> : <>Local flight <span>No published route in this scenario</span></>}</p>
            <p className="hero-description hero-flight-description">{flight.distanceKm.toFixed(1)} km from the sample location.</p>
            <div className="hero-crossing" role="progressbar" aria-label={`${flight.callsign} crossing the zone`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${Math.round(progress)}%, ${crossingStatus.toLowerCase()}`}>
              <div className="hero-crossing-heading"><span>Through your sky</span><strong>{Math.round(progress)}%</strong></div>
              <div className="hero-crossing-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="hero-crossing-ends"><span>Entered zone</span><span>Leaves zone</span></div>
            </div>
            <div className="hero-playback">
              <button type="button" className="zone-play" disabled={phase === "exiting"} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : "Resume"}</button>
              <button type="button" className="zone-reset" onClick={() => selectFlight(selected.id)}><RotateCcw size={15} />Replay</button>
              <span>30× speed · {Math.round(crossingDurationMs / 1000)} sec crossing</span>
            </div>
          </div>
          <div className="aircraft-scene" aria-hidden="true">
            <div className="hero-location"><MapPin size={19} /><span>You are here</span><small>Illustrated crossing</small></div>
            <div className={`proximity-pulse ${closestMoment ? "is-visible" : ""}`}><span /><span /><i /></div>
            <div className="aircraft-wrap" key={`aircraft-${selected.id}-${flightRun}`} style={{ left: `${40 + progress * .2}%` }}>
              <span className="aircraft-trail" />
              <img src={aircraftImage(flight.aircraftType ?? "")} alt="" className="aircraft-image" style={{ transform: `scale(${aircraftScale})` }} />
            </div>
          </div>
          <div className={`hero-closest-card ${showClosestCard ? "is-visible" : ""}`} aria-hidden={!showClosestCard} role={showClosestCard ? "status" : undefined}>
            <span className="hero-closest-eyebrow"><MapPin size={14} /> {progress <= 57 ? "LOOK UP NOW" : "JUST PASSED"}</span>
            <strong>{directlyOverhead ? progress <= 57 ? "Passing overhead" : "Passed overhead" : "Closest approach"}</strong>
            <span>{flight.callsign} · {Math.round(flight.altitudeFt).toLocaleString()} ft</span>
            <small>{directlyOverhead ? "Path passes within 1 km of your location" : `Path passes ${crossing?.closestKm.toFixed(1)} km from your location`}</small>
          </div>
        </> : <div className="hero-inner hero-empty">
          <p className="hero-status"><span className="signal-dot quiet-dot" /> Waiting for a plane</p>
          <h1 id="hero-title">A quiet sky.<br /><em>For now.</em></h1>
          <p className="hero-description">No aircraft are inside the sample zone. Choose a simulated flight below to watch it enter, cross, and leave your sky.</p>
          <button type="button" className="primary-button" onClick={() => document.getElementById("presets-title")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Simulate an arrival <ArrowRight size={18} /></button>
        </div>}
        {!flight && <div className="quiet-orbit" aria-hidden="true"><span /><span /><span /><i /></div>}
        <div className="hero-baseline"><span>{flight ? `${flight.callsign} · ${flight.aircraftType}` : "No aircraft in the zone"}</span><span>10 nautical mile zone</span></div>
      </section>

      <section className="presets-section compact-presets" aria-labelledby="presets-title">
        <div className="presets-heading"><h2 id="presets-title">Try a flight</h2><p>Fictional flights · Choose a scenario to start.</p></div>
        <div className="preset-list" role="group" aria-label="Sample flights">
          {demoFlights.map((item) => (
            <button key={item.id} type="button" className={`preset-button ${selectedId === item.id ? "active" : ""}`} aria-pressed={selectedId === item.id} onClick={() => selectFlight(item.id)}>
              <span className="preset-icon"><Navigation2 size={18} /></span>
              <span><strong>{item.label}</strong><small>{item.aircraft.callsign}</small></span>
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
            <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3>{flight?.callsign ?? "Flight details"}</h3></div>
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

      <section className="weather-section" aria-label="Sample weather">
          <article className="detail-panel weather-panel">
            <div className="detail-title"><CloudSun size={19} strokeWidth={1.8} /><h3>Sample weather</h3></div>
            <div className="weather-main"><strong className="weather-temp">{demoWeather.temperatureF}°</strong><div><strong>Partly cloudy</strong><span>Illustrative conditions</span></div></div>
            <div className="weather-stats">
              <span><CloudSun size={17} /> Cloud cover <strong>{demoWeather.cloudCover}%</strong></span>
              <span><Wind size={17} /> Wind <strong>{demoWeather.windMph} mph</strong></span>
            </div>
          </article>
      </section>

      <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span>Map: OpenStreetMap</span></footer>
    </main>
  );
}
