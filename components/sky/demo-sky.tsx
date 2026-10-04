"use client";

import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, MapPin, Navigation2, Pause, Play, RotateCcw } from "lucide-react";
import FlightMap from "../map/flight-map";
import ModeToggle from "../controls/mode-toggle";
import { demoElapsedFractionAtProgress, demoFlights, demoPlace, demoProgressAtElapsedFraction, demoWeather, distanceFromDemoPlace, sampleDemoProfile } from "../../lib/demo-data";
import { positionAtZoneProgress, zoneProgress } from "../../lib/zone-progress";
import FlightIdentity, { flightIdentityText } from "../boarding-pass/flight-identity";
import BoardingPassActions from "../boarding-pass/boarding-pass-actions";
import BoardingRoute from "../boarding-pass/boarding-route";
import { BoardingPassStats, BoardingPassStub } from "../boarding-pass/boarding-pass-extras";
import HeroProgressLine from "../sky/hero-progress-line";
import BoardingPassDisplay from "../boarding-pass/boarding-pass-display";
import FlipHeading from "../boarding-pass/flip-heading";
import { aircraftVisualForFlight } from "../../lib/aircraft-visual";
import { formatDistanceNm } from "../../lib/flight-display";
import ProjectCredits from "../project-credits";
import WeatherUnitToggle from "../controls/weather-unit-toggle";
import { formatTemperature, formatWind, type WeatherUnit } from "../../lib/weather-units";
import HeroBackgroundToggle, { type HeroBackground } from "../controls/hero-background-toggle";
import ThemeToggle from "../controls/theme-toggle";
import { advanceDemoElapsed } from "../../lib/demo-clock";
import TicketFlightPicker from "../boarding-pass/ticket-flight-picker";
import BoardingBarcode from "../boarding-pass/boarding-barcode";

const DEMO_CROSSING_DURATION_MS = 30_000;
const AircraftModel = lazy(() => import("../sky/aircraft-model"));
const HeroCloud = lazy(() => import("../sky/hero-cloud"));

export default function DemoSky({ onModeChange, weatherUnit, onWeatherUnitChange, heroBackground, onHeroBackgroundChange }: { onModeChange: (mode: "live" | "demo") => void; weatherUnit: WeatherUnit; onWeatherUnitChange: (unit: WeatherUnit) => void; heroBackground: HeroBackground; onHeroBackgroundChange: (background: HeroBackground) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const quietStubRef = useRef<HTMLDivElement>(null);
  const stubPositionsRef = useRef<{ root: DOMRect; fields: { element: HTMLElement; rect: DOMRect }[] } | null>(null);
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

  useLayoutEffect(() => {
    const previous = stubPositionsRef.current;
    stubPositionsRef.current = null;
    const root = quietStubRef.current;
    if (!pickerOpen || !previous || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = root.getBoundingClientRect();
    const rootY = previous.root.top - next.top;
    const timing = { duration: 520, easing: "cubic-bezier(.22, 1, .36, 1)" };
    const fields = previous.fields.map(({ element, rect }) => ({ element, rect, current: element.getBoundingClientRect() }));
    const animations = [root.animate([{ transform: `translateY(${rootY}px)` }, { transform: "translateY(0)" }], timing)];
    for (const { element, rect, current } of fields) {
      const x = rect.left - current.left;
      const y = rect.top - current.top - rootY;
      const scale = element.matches(".boarding-barcode") ? rect.width / current.width : 1;
      animations.push(element.animate([
        { transform: `translate(${x}px, ${y}px) scaleX(${scale})`, transformOrigin: "left center" },
        { transform: "translate(0, 0) scaleX(1)", transformOrigin: "left center" },
      ], timing));
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [pickerOpen]);

  function revealFlightPicker() {
    const root = quietStubRef.current;
    if (root) stubPositionsRef.current = {
      root: root.getBoundingClientRect(),
      fields: Array.from(root.querySelectorAll<HTMLElement>(".boarding-pass-stub-codes > div, .boarding-barcode")).map((element) => ({ element, rect: element.getBoundingClientRect() })),
    };
    setPickerOpen(true);
  }

  useEffect(() => {
    if (!playing || !selected) return;
    let lastTick = performance.now();
    const tick = () => {
      const now = performance.now();
      const nextElapsed = advanceDemoElapsed(elapsedRef.current, lastTick, now, DEMO_CROSSING_DURATION_MS);
      lastTick = now;
      elapsedRef.current = nextElapsed;
      const next = elapsedRef.current === DEMO_CROSSING_DURATION_MS
        ? 100 : demoProgressAtElapsedFraction(selected.profile, elapsedRef.current / DEMO_CROSSING_DURATION_MS);
      progressRef.current = next;
      setProgress(next);
      if (elapsedRef.current === DEMO_CROSSING_DURATION_MS) {
        setPlaying(false);
        setPhase("exiting");
      }
    };
    const timer = window.setInterval(tick, 50);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
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
    setPickerOpen(false);
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
    setPickerOpen(true);
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
    <main className={`app-shell hero-background-${heroBackground} demo-ticket-picker`}>
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
            <ThemeToggle />
            <span className="top-divider" />
            <span className="topbar-place" title={demoPlace.label}><MapPin size={15} /><span className="topbar-place-text">{demoPlace.label}</span></span>
          </div>
        </div>
      </header>

      <section className={`sky-stage sky-${phase} ${flight ? "has-flight" : ""}`} aria-labelledby="hero-title">
        <div className="sky-art" aria-hidden="true" />
        <div className="sky-overlay" aria-hidden="true" />
        {!flight && <Suspense fallback={null}><HeroCloud /></Suspense>}
        <BoardingPassDisplay displayKey={displayKey} active={Boolean(flight && selected)} onDisplayed={(shownKey) => {
          if (shownKey !== displayKey) return;
          passReadyRef.current = true;
          startWhenReady();
        }}>
        <div className="boarding-pass-main">
          <FlipHeading text={flight && selected ? crossingStatus : "A quiet sky.\nFor now."} />
          {flight && selected ? <>
              <FlightIdentity {...flight} demo />
              <div className="boarding-pass-route-spacing" aria-hidden="true" />
              <BoardingRoute origin={routeEntry} destination={routeExit} zoneSegment={!routeKnown} />
              <button type="button" className="ticket-choose-another" onClick={clearSky}>← Choose another flight</button>
          </> : pickerOpen ? <TicketFlightPicker onSelect={selectFlight} /> : null}
        </div>
        {flight && selected ?
            <BoardingPassStub demo callsign={flight.callsign} aircraftType={flight.aircraftType}>
              <div className="hero-flight-details">
                <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={flight.distanceKm} />
                <BoardingPassActions className="hero-playback">
                  <button type="button" className="zone-play" disabled={phase === "exiting" || preparing} onClick={() => setPlaying((value) => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{preparing ? "Preparing…" : playing ? "Pause" : "Resume"}</button>
                  <button type="button" className="zone-reset" onClick={() => selectFlight(selected.id)}><RotateCcw size={15} />Replay</button>
                </BoardingPassActions>
              </div>
            </BoardingPassStub>
        : <div ref={quietStubRef} className={`boarding-pass-stub demo-quiet-stub ${pickerOpen ? "is-open" : ""}`}>
            <div className="boarding-pass-stub-codes">
              <div><span>SKY STATUS</span><strong>No aircraft in the zone</strong></div>
              <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
            </div>
            <div className="boarding-pass-stub-details">
              <div className="demo-stub-footer">
                <div className="demo-flight-launch" inert={pickerOpen} aria-hidden={pickerOpen}>
                  <button type="button" className="primary-button" tabIndex={pickerOpen ? -1 : 0} onClick={revealFlightPicker}>Simulate a flight <ArrowRight size={18} /></button>
                </div>
                <BoardingBarcode />
              </div>
            </div>
          </div>}
        </BoardingPassDisplay>
        {flight && selected && <div className="sky-aircraft-layer"><Suspense fallback={null}><AircraftModel key={selected.id} progress={progress} visual={aircraftVisualForFlight(flight)} entranceRun={flightRun} onReady={() => {
          modelReadyRef.current = true;
          startWhenReady();
        }} /></Suspense></div>}
        {flight && <HeroProgressLine key={`${selectedId}-${flightRun}`} progress={progress} label={`${flight.callsign || "Aircraft"} crossing the zone`} valueText={`${Math.round(progress)}%, ${crossingStatus.toLowerCase()}`} />}
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
              <div><span>Altitude</span><strong>{Math.round(flight.altitudeFt).toLocaleString()} ft</strong></div>
              <div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div>
              <div><span>Distance</span><strong>{formatDistanceNm(flight.distanceKm)}</strong></div>
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

      <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><HeroBackgroundToggle value={heroBackground} onChange={onHeroBackgroundChange} /><WeatherUnitToggle value={weatherUnit} onChange={onWeatherUnitChange} /><ProjectCredits /></footer>
    </main>
  );
}
