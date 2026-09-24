"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, LocateFixed, MapPin, Navigation2, RefreshCw, Wind } from "lucide-react";
import FlightMap, { type MapAircraft } from "./flight-map";
import ModeToggle from "./mode-toggle";
import { demoPlace } from "./demo-data";
import { distanceKm, estimatePosition } from "../lib/flight-estimate";
import { ZONE_RADIUS_KM, zoneProgress } from "../lib/zone-progress";

type Place = { lat: number; lon: number; label: string; sample: boolean };
type LiveFlight = {
  hex: string; callsign: string | null; registration: string | null; aircraftType: string | null;
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

function aircraftImage(type: string) {
  if (/^(B7[4-8]|A3[0-2]|BCS)/.test(type)) return "/aircraft/narrowbody.png";
  if (/^(B7[6-9]|A3[3-5]|A38)/.test(type)) return "/aircraft/widebody.png";
  return "/aircraft/regional.png";
}

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
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [data, setData] = useState<SkyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clockMs, setClockMs] = useState(0);
  const [departure, setDeparture] = useState<{ flight: LiveFlight; lastReportAge: number; at: number } | null>(null);
  const [closestNotice, setClosestNotice] = useState<{ hex: string; until: number } | null>(null);
  const latestSkyRef = useRef<{ response: SkyResponse; receivedAt: number; place: Place } | null>(null);
  const previousProgressRef = useRef<{ hex: string; percent: number } | null>(null);

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
        if (selectedHex) params.set("selected", selectedHex);
        const response = await fetch(`/api/sky?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Live sky is temporarily unavailable.");
        const result = await response.json() as SkyResponse;
        if (!active || requestId !== latestRequest) return;
        const now = Date.now();
        const previous = latestSkyRef.current;
        const previousFlight = previous?.response.flight;
        const previousAircraft = previous?.response.aircraft.find((plane) => plane.hex === previousFlight?.hex);
        const samePlace = previous?.place.lat === place.lat && previous?.place.lon === place.lon;
        const flightVanished = previousFlight && !result.aircraft.some((plane) => plane.hex === previousFlight.hex);
        if (samePlace && flightVanished && previousAircraft && !result.warnings.some((warning) => warning.includes("aircraft"))) {
          const position = estimatePosition(previousAircraft, (now - previous.receivedAt) / 1000);
          const crossing = zoneProgress(place, { ...previousAircraft, lat: position.lat, lon: position.lon });
          if (crossing?.motion === "leaving" && distanceKm(place, position) >= ZONE_RADIUS_KM * 0.95) {
            setDeparture({ flight: previousFlight, lastReportAge: position.ageSeconds, at: now });
          } else {
            setDeparture(null);
          }
        } else {
          setDeparture(null);
        }
        latestSkyRef.current = { response: result, receivedAt: now, place };
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
  }, [place, selectedHex, refreshKey]);

  useEffect(() => {
    if (!departure) return;
    const timer = window.setTimeout(() => setDeparture(null), 2500);
    return () => window.clearTimeout(timer);
  }, [departure]);

  const useLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) { setLocationError("Your browser does not support location access."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        latestSkyRef.current = null;
        setDeparture(null);
        setPlace({ lat: coords.latitude, lon: coords.longitude, label: "Your location · live sky", sample: false });
        setSelectedHex(null);
        setData(null);
        setReceivedAt(0);
        setLoading(true);
        setLocating(false);
      },
      () => { setLocationError("Location unavailable. Showing the live sky over Chicago."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const flight = departure?.flight ?? data?.flight ?? null;
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
  const selectedAircraft = departure ? null : aircraft.find((plane) => plane.hex === flight?.hex);
  const routeKnown = Boolean(flight?.origin && flight?.destination);
  const flightName = flight?.callsign || flight?.registration || flight?.hex.toUpperCase() || "Aircraft";
  const crossing = selectedAircraft ? zoneProgress(place, selectedAircraft) : flight?.zoneProgress ?? null;
  const progress = departure ? 100 : crossing?.percent ?? null;
  const showClosestNotice = !departure && !!flight && !!crossing
    && (progress != null && progress >= 43 && progress <= 57
      || closestNotice?.hex === flight.hex && clockMs < closestNotice.until);
  const shownDistanceKm = selectedAircraft?.distanceKm ?? flight?.distanceKm ?? 0;
  const shownAgeSeconds = departure
    ? departure.lastReportAge + Math.max(0, (clockMs - departure.at) / 1000)
    : selectedAircraft?.seenSeconds ?? flight?.seenSeconds ?? 0;
  const positionEstimated = Boolean(selectedAircraft?.estimated);
  const aircraftOffset = progress == null ? 0 : (progress - 50) * 0.6;
  const aircraftScale = progress == null ? 1 : 1 + 0.08 * Math.sin(Math.PI * progress / 100) ** 2;
  const motionStatus = crossing?.motion === "leaving"
    ? place.sample ? "Moving away from Chicago" : "Moving away from you"
    : crossing?.motion === "approaching"
      ? place.sample ? "Coming closer to Chicago" : "Coming closer to you"
      : "Live aircraft nearby";

  useEffect(() => {
    if (!flight || departure || progress == null) {
      previousProgressRef.current = null;
      return;
    }
    const previous = previousProgressRef.current;
    if (previous?.hex === flight.hex && previous.percent < 50 && progress >= 50) {
      setClosestNotice({ hex: flight.hex, until: Date.now() + 10_000 });
    }
    previousProgressRef.current = { hex: flight.hex, percent: progress };
  }, [flight, departure, progress]);

  return <main className="app-shell live-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
      <div className="topbar-right"><ModeToggle mode="live" onChange={onModeChange} /><span className="top-divider" /><span className="topbar-place"><MapPin size={15} />{place.label}</span></div>
    </header>

    <section className={`sky-stage live-stage ${flight ? "sky-active" : "sky-empty"}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" /><div className="sky-overlay" aria-hidden="true" />
      <div className={`hero-inner ${flight ? "hero-flight" : "hero-empty"}`}>
        <p className="hero-status" role="status"><span className={`signal-dot ${error ? "quiet-dot" : ""}`} /> {departure ? `Goodbye, ${flightName}.` : error ? "Live feed interrupted" : loading && !data ? "Checking the sky" : flight ? motionStatus : "Live sky"}</p>
        <h1 id="hero-title">{departure ? <>A plane just<br /><em>passed by.</em></> : flight ? crossing?.motion === "approaching" ? <>Coming<br /><em>closer.</em></> : crossing?.motion === "leaving" ? <>Moving<br /><em>away.</em></> : <>A plane is<br /><em>nearby.</em></> : <>Look up.<br /><em>See what&apos;s there.</em></>}</h1>
        {flight ? <>
          <div className="hero-flight-identity"><strong>{flightName}</strong><span>{flight.aircraftType || "Aircraft type unknown"}</span></div>
          <p className="hero-route">{routeKnown ? <>{flight.origin!.code}<ArrowRight size={16} aria-hidden="true" />{flight.destination!.code}<span>{flight.origin!.city} to {flight.destination!.city}</span></> : <>Route unavailable <span>Flight path could not be confirmed</span></>}</p>
          <p className="hero-description hero-flight-description">{departure ? "Last reported" : positionEstimated ? "Estimated" : "Reported"} distance {shownDistanceKm.toFixed(1)} km from {place.sample ? "central Chicago" : "your location"} · {flight.altitudeFt == null ? "Altitude unavailable" : `${Math.round(flight.altitudeFt).toLocaleString()} ft altitude`}. Last report {Math.round(shownAgeSeconds)} sec ago.</p>
          {progress != null ? <div className="hero-crossing live-crossing" role="progressbar" aria-label={`${flightName} crossing the 5 nautical mile zone`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(progress.toFixed(1))} aria-valuetext={departure ? "100%, aircraft no longer reported in the zone" : `${progress.toFixed(1)}% through the zone, estimated from the latest reported position and heading`}>
            <div className="hero-crossing-heading"><span>Through your sky</span><strong>{progress.toFixed(1)}%</strong></div>
            <div className="hero-crossing-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="hero-crossing-ends"><span>Entered zone</span><span>Leaves zone</span></div>
            <p>{departure ? "No longer reported in the zone. Exit timing is estimated." : "Estimated between reports from the latest position, heading, and speed. May jump when a new report arrives."}</p>
          </div> : <div className="hero-crossing live-crossing"><div className="hero-crossing-heading"><span>Through your sky</span><strong>—</strong></div><p>Crossing progress is unavailable until a heading is reported.</p></div>}
        </> : <p className="hero-description">{error || (loading ? "Finding aircraft in the 5 nautical mile zone." : `No aircraft currently reported within 5 nautical miles of ${place.sample ? "central Chicago" : "your location"}.`)}</p>}
        <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
        {locationError && <p className="live-location-error" role="status">{locationError}</p>}
        {place.sample && <p className="live-place-note">Showing real flights over Chicago until you choose your location.</p>}
      </div>
      {flight ? <div className={`live-aircraft-scene ${departure ? "is-departing" : ""}`} aria-hidden="true" style={{ transform: `translateX(${aircraftOffset}px) scale(${aircraftScale})` }}><img src={aircraftImage(flight.aircraftType ?? "")} alt="" /><span>Illustration · position shown on map</span></div> : <div className="quiet-orbit" aria-hidden="true"><span /><span /><span /><i /></div>}
      {showClosestNotice && flight && crossing && <div className="hero-closest-card is-visible" role="status">
        <span className="hero-closest-eyebrow"><MapPin size={14} /> {progress != null && progress < 50 ? "CLOSEST APPROACH SOON" : "JUST PASSED"}</span>
        <strong>{crossing.closestKm <= 1 ? progress != null && progress < 50 ? "Passing overhead soon" : "Passed overhead" : "Closest approach"}</strong>
        <span>{flightName}{flight.altitudeFt == null ? "" : ` · ${Math.round(flight.altitudeFt).toLocaleString()} ft`}</span>
        <small>Projected to pass {crossing.closestKm.toFixed(1)} km from {place.sample ? "central Chicago" : "your location"}.</small>
      </div>}
      <div className="hero-baseline"><span>{data ? `${data.nearbyCount} aircraft reported nearby` : "Waiting for live data"}</span><span>Updates every 30 seconds</span></div>
    </section>

    <div className="sky-dashboard">
      <FlightMap lat={place.lat} lon={place.lon} aircraft={aircraft} closestHex={aircraft[0]?.hex ?? null} selectedAircraftHex={departure ? data?.flight?.hex ?? null : flight?.hex ?? null} loading={loading && !data} unavailable={Boolean(error)} locationLabel={place.sample ? "Central Chicago" : "Your location"} onSelect={setSelectedHex} />
      <aside className="flight-sidebar" aria-label="Live flight details"><article className="detail-panel flight-panel">
        <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3>{flightName}</h3></div>
        {flight ? <><div className="airport-row"><div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unknown"}</span></div><ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" /><div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unknown"}</span></div></div>
          <div className="stat-row"><div><span>Altitude</span><strong>{flight.altitudeFt == null ? "—" : `${Math.round(flight.altitudeFt).toLocaleString()} ft`}</strong></div><div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div><div><span>Distance</span><strong>{shownDistanceKm.toFixed(1)} km</strong></div></div><p className="data-note">{routeKnown ? "Route reported by AirLabs" : "Route unavailable"} · Last report {Math.round(shownAgeSeconds)} sec ago{positionEstimated ? " · Position estimated" : ""}</p></> : <p className="empty-copy">{loading ? "Checking for nearby flights…" : error || "No aircraft reported in this zone right now."}</p>}
      </article></aside>
    </div>

    <section className="weather-section" aria-label="Current weather"><article className="detail-panel weather-panel">
      <div className="detail-title"><CloudSun size={19} strokeWidth={1.8} /><h3>Current weather</h3></div>
      {data?.weather ? <><div className="weather-main"><strong className="weather-temp">{Math.round(data.weather.temperatureF)}°</strong><div><strong>{weatherLabel(data.weather.code)}</strong><span>{place.sample ? "Central Chicago" : "Near your location"}</span></div></div><div className="weather-stats"><span><CloudSun size={17} /> Cloud cover <strong>{data.weather.cloudCover}%</strong></span><span><Wind size={17} /> Wind <strong>{Math.round(data.weather.windMph)} mph</strong></span></div></> : <p className="live-weather-empty">{loading ? "Loading current conditions…" : "Current weather unavailable."}</p>}
    </article></section>
    <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span className="live-attribution">Data: <a href="https://airlabs.co/">AirLabs</a> · <a href="https://open-meteo.com/">Open-Meteo</a> · Map: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></span></footer>
  </main>;
}
