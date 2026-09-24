"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CloudSun, LocateFixed, MapPin, Navigation2, RefreshCw, Wind } from "lucide-react";
import FlightMap, { type MapAircraft } from "./flight-map";
import ModeToggle from "./mode-toggle";
import { demoPlace } from "./demo-data";

type Place = { lat: number; lon: number; label: string; sample: boolean };
type LiveFlight = {
  hex: string; callsign: string | null; registration: string | null; aircraftType: string | null;
  altitudeFt: number | null; speedKts: number | null; distanceKm: number; elevationDeg: number | null;
  seenSeconds: number; origin: { code: string; city: string } | null;
  destination: { code: string; city: string } | null;
  routeStatus: string;
  zoneProgress: { percent: number; remainingKm: number; crossingKm: number; closestKm: number } | null;
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
        setData(result);
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

  const useLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) { setLocationError("Your browser does not support location access."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPlace({ lat: coords.latitude, lon: coords.longitude, label: "Your location · live sky", sample: false });
        setSelectedHex(null);
        setData(null);
        setLoading(true);
        setLocating(false);
      },
      () => { setLocationError("Location unavailable. Showing the live sky over Chicago."); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  const flight = data?.flight ?? null;
  const aircraft = data?.aircraft ?? [];
  const routeKnown = Boolean(flight?.origin && flight?.destination);
  const flightName = flight?.callsign || flight?.registration || flight?.hex.toUpperCase() || "Aircraft";
  const crossing = flight?.zoneProgress ?? null;
  const progress = crossing?.percent ?? null;
  const aircraftOffset = progress == null ? 0 : (progress - 50) * 0.6;
  const aircraftScale = progress == null ? 1 : 1 + 0.08 * Math.sin(Math.PI * progress / 100) ** 2;

  return <main className="app-shell live-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
      <div className="topbar-right"><ModeToggle mode="live" onChange={onModeChange} /><span className="top-divider" /><span className="topbar-place"><MapPin size={15} />{place.label}</span></div>
    </header>

    <section className={`sky-stage live-stage ${flight ? "sky-active" : "sky-empty"}`} aria-labelledby="hero-title">
      <div className="sky-art" aria-hidden="true" /><div className="sky-overlay" aria-hidden="true" />
      <div className={`hero-inner ${flight ? "hero-flight" : "hero-empty"}`}>
        <p className="hero-status" role="status"><span className={`signal-dot ${error ? "quiet-dot" : ""}`} /> {error ? "Live feed interrupted" : loading && !data ? "Checking the sky" : flight ? "Live aircraft nearby" : "Live sky"}</p>
        <h1 id="hero-title">{flight ? <>A plane is<br /><em>nearby.</em></> : <>Look up.<br /><em>See what&apos;s there.</em></>}</h1>
        {flight ? <>
          <div className="hero-flight-identity"><strong>{flightName}</strong><span>{flight.aircraftType || "Aircraft type unknown"}</span></div>
          <p className="hero-route">{routeKnown ? <>{flight.origin!.code}<ArrowRight size={16} aria-hidden="true" />{flight.destination!.code}<span>{flight.origin!.city} to {flight.destination!.city}</span></> : <>Route unavailable <span>Flight path could not be confirmed</span></>}</p>
          <p className="hero-description hero-flight-description">{flight.distanceKm.toFixed(1)} km from {place.sample ? "central Chicago" : "your location"} · {flight.altitudeFt == null ? "Altitude unavailable" : `${Math.round(flight.altitudeFt).toLocaleString()} ft altitude`}. Position received {Math.round(flight.seenSeconds)} sec ago.</p>
          {progress != null ? <div className="hero-crossing live-crossing" role="progressbar" aria-label={`${flightName} crossing the 10 nautical mile zone`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${Math.round(progress)}% through the zone, estimated from the latest reported position and heading`}>
            <div className="hero-crossing-heading"><span>Through your sky</span><strong>{Math.round(progress)}%</strong></div>
            <div className="hero-crossing-track"><span style={{ width: `${progress}%` }} /></div>
            <div className="hero-crossing-ends"><span>Entered zone</span><span>Leaves zone</span></div>
            <p>Estimated from the latest reported position and heading.</p>
          </div> : <div className="hero-crossing live-crossing"><div className="hero-crossing-heading"><span>Through your sky</span><strong>—</strong></div><p>Crossing progress is unavailable until a heading is reported.</p></div>}
        </> : <p className="hero-description">{error || (loading ? "Finding aircraft in the 10 nautical mile zone." : `No aircraft currently reported within 10 nautical miles of ${place.sample ? "central Chicago" : "your location"}.`)}</p>}
        <div className="live-actions"><button type="button" className="primary-button" onClick={useLocation} disabled={locating}><LocateFixed size={17} />{locating ? "Finding your location…" : "Use my location"}</button><button type="button" className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={15} />Refresh</button></div>
        {locationError && <p className="live-location-error" role="status">{locationError}</p>}
        {place.sample && <p className="live-place-note">Showing real flights over Chicago until you choose your location.</p>}
      </div>
      {flight ? <div className="live-aircraft-scene" aria-hidden="true" style={{ transform: `translateX(${aircraftOffset}px) scale(${aircraftScale})` }}><img src={aircraftImage(flight.aircraftType ?? "")} alt="" /><span>Illustration · position shown on map</span></div> : <div className="quiet-orbit" aria-hidden="true"><span /><span /><span /><i /></div>}
      <div className="hero-baseline"><span>{data ? `${data.nearbyCount} aircraft reported nearby` : "Waiting for live data"}</span><span>Updates every 30 seconds</span></div>
    </section>

    <div className="sky-dashboard">
      <FlightMap lat={place.lat} lon={place.lon} aircraft={aircraft} closestHex={aircraft[0]?.hex ?? null} selectedAircraftHex={flight?.hex ?? null} loading={loading && !data} unavailable={Boolean(error)} locationLabel={place.sample ? "Central Chicago" : "Your location"} onSelect={setSelectedHex} />
      <aside className="flight-sidebar" aria-label="Live flight details"><article className="detail-panel flight-panel">
        <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3>{flightName}</h3></div>
        {flight ? <><div className="airport-row"><div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unknown"}</span></div><ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" /><div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unknown"}</span></div></div>
          <div className="stat-row"><div><span>Altitude</span><strong>{flight.altitudeFt == null ? "—" : `${Math.round(flight.altitudeFt).toLocaleString()} ft`}</strong></div><div><span>Ground speed</span><strong>{flight.speedKts == null ? "—" : `${Math.round(flight.speedKts)} kt`}</strong></div><div><span>Distance</span><strong>{flight.distanceKm.toFixed(1)} km</strong></div></div><p className="data-note">{routeKnown ? "Route reported by AirLabs" : "Route unavailable"} · Position {Math.round(flight.seenSeconds)} sec old</p></> : <p className="empty-copy">{loading ? "Checking for nearby flights…" : error || "No aircraft reported in this zone right now."}</p>}
      </article></aside>
    </div>

    <section className="weather-section" aria-label="Current weather"><article className="detail-panel weather-panel">
      <div className="detail-title"><CloudSun size={19} strokeWidth={1.8} /><h3>Current weather</h3></div>
      {data?.weather ? <><div className="weather-main"><strong className="weather-temp">{Math.round(data.weather.temperatureF)}°</strong><div><strong>{weatherLabel(data.weather.code)}</strong><span>{place.sample ? "Central Chicago" : "Near your location"}</span></div></div><div className="weather-stats"><span><CloudSun size={17} /> Cloud cover <strong>{data.weather.cloudCover}%</strong></span><span><Wind size={17} /> Wind <strong>{Math.round(data.weather.windMph)} mph</strong></span></div></> : <p className="live-weather-empty">{loading ? "Loading current conditions…" : "Current weather unavailable."}</p>}
    </article></section>
    <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span className="live-attribution">Data: <a href="https://airlabs.co/">AirLabs</a> · <a href="https://open-meteo.com/">Open-Meteo</a> · Map: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></span></footer>
  </main>;
}
