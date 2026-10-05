"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, LocateFixed, Navigation2, RefreshCw } from "lucide-react";
import FlightMap from "../map/flight-map";
import SiteHeader from "../site-header";
import LocationFeedback from "../controls/location-feedback";
import { createLocationRequester, type LocationIssue } from "../../lib/location-access";
import { ZONE_RADIUS_KM, zoneProgress } from "../../lib/zone-progress";
import { closestLiveAircraft, projectLiveAircraft } from "../../lib/live-snapshot";
import FlightLink from "../boarding-pass/flight-link";
import FlightIdentity, { flightIdentityText } from "../boarding-pass/flight-identity";
import BoardingPassActions from "../boarding-pass/boarding-pass-actions";
import BoardingRoute from "../boarding-pass/boarding-route";
import { BoardingPassStats, BoardingPassStub } from "../boarding-pass/boarding-pass-extras";
import type { SkyResponse } from "../../lib/sky-contract";
import HeroProgressLine from "./hero-progress-line";
import BoardingPassDisplay from "../boarding-pass/boarding-pass-display";
import FlipHeading from "../boarding-pass/flip-heading";
import { aircraftVisualForFlight } from "../../lib/aircraft-visual";
import { formatDistanceNm } from "../../lib/flight-display";
import SiteFooter from "../site-footer";
import { type WeatherUnit } from "../../lib/weather-units";
import type { HeroBackground } from "../controls/hero-background-toggle";

export type Place = { lat: number; lon: number; label: string; sample: boolean };
const AircraftModel = lazy(() => import("./aircraft-model"));
const HeroCloud = lazy(() => import("./hero-cloud"));
export default function LiveSky({ onModeChange, place, onPlaceChange, weatherUnit, onWeatherUnitChange, heroBackground, onHeroBackgroundChange }: { onModeChange: (mode: "live" | "demo") => void; place: Place; onPlaceChange: (place: Place) => void; weatherUnit: WeatherUnit; onWeatherUnitChange: (unit: WeatherUnit) => void; heroBackground: HeroBackground; onHeroBackgroundChange: (background: HeroBackground) => void }) {
  const [data, setData] = useState<SkyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationIssue, setLocationIssue] = useState<LocationIssue | null>(null);
  const locationRequesterRef = useRef<ReturnType<typeof createLocationRequester> | null>(null);
  const [locating, setLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clockMs, setClockMs] = useState(0);
  const exitRefreshHex = useRef<string | null>(null);
  const takeoverRefreshHex = useRef<string | null>(null);

  useEffect(() => {
    if (!receivedAt) return;
    let frame = 0;
    let lastFrame = 0;
    const tick = (time: number) => {
      if (!document.hidden && time - lastFrame >= 1000 / (data?.aircraft.length ? 30 : 1)) {
        lastFrame = time;
        const now = Date.now();
        setClockMs(now);
        if (now - receivedAt >= 90_000) return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    const resume = () => {
      if (!document.hidden) {
        lastFrame = 0;
        setClockMs(Date.now());
      }
    };
    frame = window.requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [receivedAt, data?.aircraft.length]);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    async function refresh() {
      const requestId = ++latestRequest;
      try {
        const params = new URLSearchParams({ mode: "live", lat: String(place.lat), lon: String(place.lon) });
        const response = await fetch(`/api/sky?${params}`, { cache: "no-store" });
        if (!response.ok) {
          const problem = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(problem?.error || "Live sky is temporarily unavailable.");
        }
        const result = await response.json() as SkyResponse;
        if (!active || requestId !== latestRequest) return;
        const now = Date.now();
        if (exitRefreshHex.current !== result.flight?.hex) exitRefreshHex.current = null;
        if (takeoverRefreshHex.current === result.flight?.hex) takeoverRefreshHex.current = null;
        setData(result);
        setReceivedAt(now - Math.max(0, result.snapshotAgeMs));
        setClockMs(now);
        setError(result.warnings.find((warning) => warning.includes("aircraft")) ?? null);
      } catch (reason) {
        if (active && requestId === latestRequest) setError(reason instanceof Error ? reason.message : "Live sky is temporarily unavailable.");
      } finally {
        if (active && requestId === latestRequest) setLoading(false);
      }
    }
    void refresh();
    return () => { active = false; };
  }, [place, refreshKey]);

  useEffect(() => {
    const requester = createLocationRequester(navigator.geolocation, {
      onStart: () => { setLocationIssue(null); setLocating(true); },
      onSuccess: ({ coords }) => {
        exitRefreshHex.current = null;
        takeoverRefreshHex.current = null;
        onPlaceChange({ lat: coords.latitude, lon: coords.longitude, label: "Your location · live sky", sample: false });
        setData(null);
        setReceivedAt(0);
        setLoading(true);
      },
      onError: setLocationIssue,
      onFinish: () => setLocating(false),
    });
    locationRequesterRef.current = requester;
    return () => { requester.cancel(); locationRequesterRef.current = null; };
  }, [onPlaceChange]);
  const useLocation = useCallback(() => locationRequesterRef.current?.request(), []);

  const aircraft = projectLiveAircraft(data?.aircraft ?? [], place, receivedAt, clockMs);
  const selectedAircraft = aircraft.find((plane) => plane.hex === data?.flight?.hex);
  const selectedAircraftPresent = Boolean(selectedAircraft);
  const inZone = Boolean(selectedAircraft && selectedAircraft.distanceKm <= ZONE_RADIUS_KM);
  const flight = inZone ? data?.flight ?? null : null;
  const closestAircraft = closestLiveAircraft(aircraft);
  useEffect(() => {
    const hex = data?.flight?.hex;
    if (hex && selectedAircraftPresent && !inZone && !error && exitRefreshHex.current !== hex) {
      exitRefreshHex.current = hex;
      setRefreshKey((key) => key + 1);
    }
  }, [data?.flight?.hex, selectedAircraftPresent, inZone, error]);
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
  const routeKnown = flight?.routeStatus === "verified";
  const routeImplausible = flight?.routeStatus === "implausible";
  const coverageWarning = data?.warnings.find((warning) => warning.includes("coverage")) ?? null;
  const refreshNeeded = Boolean(data && receivedAt && (clockMs - receivedAt >= 90_000 || (data.aircraft.length > 0 && aircraft.length === 0)));
  const flightName = flight ? flightIdentityText(flight) : "Aircraft";
  const crossing = selectedAircraft ? zoneProgress(place, selectedAircraft) : flight?.zoneProgress ?? null;
  const progress = crossing?.percent ?? null;
  const shownDistanceKm = selectedAircraft?.distanceKm ?? flight?.distanceKm ?? 0;
  const shownAgeSeconds = selectedAircraft?.seenSeconds ?? flight?.seenSeconds ?? 0;
  const positionEstimated = Boolean(selectedAircraft?.estimated);
  const flightHeading = error ? "Live feed interrupted" : crossing?.motion === "approaching" ? "Drawing closer" : crossing?.motion === "leaving" ? "Heading away" : "Live aircraft nearby";
  const minutesToZoneExit = crossing && selectedAircraft?.speedKts && selectedAircraft.speedKts > 0
    ? crossing.remainingKm / (selectedAircraft.speedKts * 1.852 / 60) : null;
  const nextAircraft = flight ? closestLiveAircraft(aircraft, flight.hex) : null;
  return <main className={`app-shell live-shell hero-background-${heroBackground}`}>
    <SiteHeader mode="live" onModeChange={onModeChange} placeLabel={place.sample ? "Downtown Houston · live sky" : place.label} weather={data?.weather ?? null} weatherUnit={weatherUnit} loading={loading} />

    <section className={`sky-stage live-stage ${flight ? "sky-active has-flight" : "sky-empty"}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" /><div className="sky-overlay" aria-hidden="true" />
      {!flight && <Suspense fallback={null}><HeroCloud /></Suspense>}
      <BoardingPassDisplay displayKey={flight ? `${flight.hex}:${flightHeading}` : "quiet"} active={Boolean(flight)}>
      <div className="boarding-pass-main">
        <FlipHeading text={flight ? flightHeading : "A quiet sky.\nFor now."} />
        {flight ? <>
          <FlightIdentity {...flight} />
          <div className="boarding-pass-route-spacing" aria-hidden="true" />
          <BoardingRoute origin={flight.origin} destination={flight.destination} />
          {!routeKnown && <p className="boarding-pass-route-note">{routeImplausible ? "Reported route does not match the aircraft’s position" : "Flight path could not be confirmed"}</p>}
        </> : (error || coverageWarning) ? <p className="hero-description" role="status">{error || coverageWarning}</p> : null}
      </div>
      {flight ?
        <BoardingPassStub aircraftModel={flight.aircraftModel} registration={flight.registration} callsign={flight.callsign} flightNumber={flight.flightNumber} flightIata={flight.flightIata} airline={flight.airline} aircraftType={flight.aircraftType}>
          <div className="hero-flight-details">
            <BoardingPassStats altitudeFt={flight.altitudeFt} speedKts={flight.speedKts} distanceKm={shownDistanceKm} />
            <p className="boarding-pass-freshness">Last reported {Math.round(shownAgeSeconds)} sec ago{coverageWarning ? " · Coverage may be incomplete" : ""}</p>
            <BoardingPassActions className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></BoardingPassActions>
            {locationIssue && <LocationFeedback key={locationIssue} issue={locationIssue} onRetry={useLocation} />}
            {nextAircraft && <div className="next-aircraft-queue" aria-label="Next closest aircraft">
              <span className="next-aircraft-label">NEXT CLOSEST</span>
              <div className="next-aircraft-main"><strong><FlightLink callsign={nextAircraft.callsign} registration={nextAircraft.registration}>{nextAircraft.callsign || nextAircraft.registration || nextAircraft.hex.toUpperCase()}</FlightLink></strong><span>{nextAircraft.originCode || "···"} → {nextAircraft.destinationCode || "···"}</span></div>
              <p>{formatDistanceNm(nextAircraft.distanceKm)} away</p>
            </div>}
          </div>
        </BoardingPassStub>
      : <div className="boarding-pass-stub">
          <div className="boarding-pass-stub-codes">
            <div><span>SKY STATUS</span><strong>{loading && !data ? "Checking for aircraft" : error ? "Feed unavailable" : coverageWarning ? "Coverage incomplete" : refreshNeeded ? "Refresh to check again" : "No nearby aircraft"}</strong></div>
            <div><span>OBSERVATION ZONE</span><strong>5 nautical miles</strong></div>
          </div>
          <div className="boarding-pass-stub-details">
            <BoardingPassActions className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></BoardingPassActions>
            {locationIssue && <LocationFeedback key={locationIssue} issue={locationIssue} onRetry={useLocation} />}
          </div>
        </div>}
      </BoardingPassDisplay>
      {flight && <div className="sky-aircraft-layer"><Suspense fallback={null}><AircraftModel key={`${flight.hex}-${aircraftVisualForFlight(flight)}`} progress={progress} visual={aircraftVisualForFlight(flight)} live /></Suspense></div>}
      {flight && <HeroProgressLine key={flight.hex} progress={progress} label={`${flightName} crossing the 5 nautical mile zone`} valueText={progress == null ? "Progress unavailable" : `${progress.toFixed(1)}% through the zone, estimated from the latest reported position and heading`} live />}
    </section>

    <div className="sky-dashboard">
      <FlightMap lat={place.lat} lon={place.lon} aircraft={aircraft} closestHex={flight?.hex ?? null} loading={loading && !data} unavailable={Boolean(error || coverageWarning)} locationLabel={place.sample ? "Downtown Houston" : "Your location"} />
      <aside className="flight-sidebar" aria-label="Live flight details"><article className="detail-panel flight-panel">
        <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3><FlightLink callsign={flight?.callsign} registration={flight?.registration}>{flightName}</FlightLink></h3></div>
        {flight ? <><div className="airport-row"><div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unknown"}</span></div><ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" /><div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unknown"}</span></div></div>
          <div className="stat-row"><div><span>Altitude</span><strong>{flight.altitudeFt == null ? "—" : `${Math.round(flight.altitudeFt).toLocaleString()} ft`}</strong></div><div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div><div><span>Distance</span><strong>{formatDistanceNm(shownDistanceKm)}</strong></div></div>
          <p className="data-note">{routeKnown ? "Route reported by AirLabs" : routeImplausible ? "Inconsistent reported route withheld" : "Route unavailable"} · Last report {Math.round(shownAgeSeconds)} sec ago{positionEstimated ? " · Position estimated" : ""}{coverageWarning ? " · Coverage may be incomplete" : ""}</p>
            <dl className="scenario-path-facts">
              <div><dt>Heading</dt><dd>{selectedAircraft?.heading == null ? "—" : `${Math.round(selectedAircraft.heading)}°`}</dd></div>
              <div><dt>Closest pass</dt><dd>{crossing ? `~${formatDistanceNm(crossing.closestKm)}` : "—"}</dd></div>
              <div><dt>To zone exit</dt><dd>{minutesToZoneExit == null ? "—" : `~${Math.max(0.1, minutesToZoneExit).toFixed(1)} min`}</dd></div>
            </dl>
          </> : <p className="empty-copy">{loading ? "Checking for nearby flights…" : error || "No aircraft reported in this zone right now."}</p>}
      </article></aside>
    </div>

    <SiteFooter heroBackground={heroBackground} onHeroBackgroundChange={onHeroBackgroundChange} weatherUnit={weatherUnit} onWeatherUnitChange={onWeatherUnitChange} />
  </main>;
}
