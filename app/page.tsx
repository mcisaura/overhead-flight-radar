"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CloudSun, LocateFixed, MapPin, Navigation2, RefreshCw, Wind } from "lucide-react";
import FlightMap, { type MapAircraft } from "./flight-map";

type Flight = {
  hex: string;
  callsign: string | null;
  registration: string | null;
  aircraftType: string | null;
  altitudeFt: number | null;
  speedKts: number | null;
  distanceKm: number;
  seenSeconds: number;
  origin: { code: string; city: string } | null;
  destination: { code: string; city: string } | null;
  routeStatus: "available" | "missing" | "unverified" | "lookup-error" | "no-callsign";
  routeSource: "adsbdb" | "airlabs" | null;
};
type Weather = { temperatureF: number; cloudCover: number; windMph: number; code: number; isDay: boolean };
type Sky = { flight: Flight | null; aircraft: MapAircraft[]; nearbyCount: number; weather: Weather | null; updatedAt: string; warnings?: string[] };
type Place = { lat: number; lon: number; label: string };

function weatherDescription(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Cloudy";
  if (code <= 67) return "Rain nearby";
  if (code <= 77) return "Snow nearby";
  if (code <= 82) return "Showers nearby";
  return "Changing skies";
}

function aircraftImage(type: string | null) {
  const value = (type ?? "").toUpperCase();
  if (/^(B7[4-8]|A3[0-2]|BCS)/.test(value)) return "/aircraft/narrowbody.png";
  if (/^(B7[6-9]|A3[3-5]|A38)/.test(value)) return "/aircraft/widebody.png";
  return "/aircraft/regional.png";
}

function numberOrDash(value: number | null, unit: string) {
  return value == null ? "—" : `${Math.round(value).toLocaleString()} ${unit}`;
}

function routeNote(flight: Flight) {
  switch (flight.routeStatus) {
    case "available": return flight.routeSource === "airlabs" ? "Live flight route from AirLabs" : "Listed route from adsbdb";
    case "missing": return "No published route found for this flight";
    case "unverified": return "Listed route did not match this aircraft’s position";
    case "lookup-error": return "Route lookup temporarily unavailable";
    case "no-callsign": return "No flight identifier for a route lookup";
  }
}

export default function Home() {
  const [place, setPlace] = useState<Place | null>(null);
  const [sky, setSky] = useState<Sky | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "loading" | "ready" | "error">("idle");
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const loadSky = useCallback(async (location: Place) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setNotice("");
    try {
      const query = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon) });
      const response = await fetch(`/api/sky?${query}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Sky data is temporarily unavailable. Try refreshing.");
      const data: Sky = await response.json();
      if (controller.signal.aborted) return;
      setSky(data);
      setStatus("ready");
      if (data.warnings?.length) setNotice(data.warnings.join(" "));
    } catch (error) {
      if (controller.signal.aborted) return;
      setSky(null);
      setStatus("error");
      setNotice(error instanceof Error ? error.message : "Could not update the sky. Try refreshing.");
    }
  }, []);

  useEffect(() => {
    if (!place) return;
    const initial = window.setTimeout(() => void loadSky(place), 0);
    const timer = window.setInterval(() => void loadSky(place), 30_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); requestRef.current?.abort(); };
  }, [place, loadSky]);

  const locate = () => {
    if (!navigator.geolocation) {
      setManual(true);
      setNotice("Location is unavailable here. Enter coordinates below.");
      return;
    }
    setStatus("locating");
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPlace({ lat: coords.latitude, lon: coords.longitude, label: "Your location" });
        setManual(false);
      },
      () => {
        setStatus("idle");
        setManual(true);
        setNotice("Location access was unavailable. Enter coordinates below.");
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 }
    );
  };

  const submitCoordinates = (event: React.FormEvent) => {
    event.preventDefault();
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!lat.trim() || !lon.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setNotice("Enter a latitude from −90 to 90 and longitude from −180 to 180.");
      return;
    }
    setSky(null);
    setPlace({ lat: latitude, lon: longitude, label: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°` });
    setManual(false);
  };

  const flight = sky?.flight;
  const weather = sky?.weather;
  const flightUnavailable = sky?.warnings?.some((warning) => warning.startsWith("Live aircraft"));
  const phase = !place ? "welcome" : status === "loading" && !sky ? "loading" : (status === "error" && !sky) || flightUnavailable ? "error" : flight ? "flight" : "quiet";
  const routeKnown = Boolean(flight?.origin && flight?.destination);
  const flightName = flight?.callsign ?? flight?.registration ?? flight?.hex.toUpperCase() ?? "Aircraft";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
        <div className="topbar-right">
          <span className="live-indicator"><span className="signal-dot" /> {place && status === "ready" ? "LIVE SKY" : "SKY WATCH"}</span>
          <span className="top-divider" />
          <span className="topbar-place"><MapPin size={15} />{place?.label ?? "Location not set"}</span>
        </div>
      </header>

      <section className={`sky-stage ${weather && !weather.isDay ? "night" : ""}`} aria-labelledby="hero-title">
        <div className="sky-art" aria-hidden="true" />
        <div className="sky-overlay" aria-hidden="true" />
        <div className="hero-inner">
          {phase === "welcome" && <>
            <h1 id="hero-title">Look up.<br /><em>Wonder where?</em></h1>
            <p className="hero-description">Meet the aircraft passing closest to you, and discover the journey behind the moment.</p>
            <button className="primary-button" onClick={locate} disabled={status === "locating"}>
              <LocateFixed size={18} /> Find the plane above me <ArrowRight size={18} />
            </button>
          </>}
          {phase === "loading" && <>
            <h1 id="hero-title">Finding your<br /><em>patch of sky.</em></h1>
            <p className="hero-description">Looking for the aircraft passing closest to you now.</p>
            <div className="loading-rule" aria-hidden="true" />
          </>}
          {phase === "flight" && flight && <>
            <p className="hero-status"><span className="signal-dot" /> Closest aircraft right now</p>
            <h1 id="hero-title" className={routeKnown ? "route-heading" : ""}>
              {routeKnown ? <>{flight.origin!.code}<span className="route-arrow"><ArrowRight size={32} strokeWidth={1.3} /></span><em>{flight.destination!.code}</em></> : <>A journey<br /><em>in motion.</em></>}
            </h1>
            {routeKnown && <p className="route-places">{flight.origin!.city} <span>to</span> {flight.destination!.city}</p>}
            <p className="hero-description">{flightName} is passing {flight.distanceKm < 1 ? "almost directly overhead" : `${flight.distanceKm.toFixed(1)} km from your location`}.{!routeKnown && ` ${routeNote(flight)}.`}</p>
          </>}
          {phase === "quiet" && <>
            <p className="hero-status"><span className="signal-dot quiet-dot" /> The sky is quiet</p>
            <h1 id="hero-title">A little room<br /><em>to breathe.</em></h1>
            <p className="hero-description">No nearby aircraft detected right now. Take a moment with the sky above you.</p>
          </>}
          {phase === "error" && <>
            <p className="hero-status"><span className="signal-dot quiet-dot" /> Connection paused</p>
            <h1 id="hero-title">The sky is<br /><em>out of reach.</em></h1>
            <p className="hero-description">Live flight data is unavailable right now. Try refreshing in a moment.</p>
          </>}
        </div>

        {flight && phase === "flight" && <div className="aircraft-wrap" aria-hidden="true">
          <span className="aircraft-trail" />
          <img src={aircraftImage(flight.aircraftType)} alt="" className="aircraft-image" />
        </div>}

        <div className="hero-baseline">
          <span>{phase === "flight" ? `${flightName} · ${flight?.aircraftType ?? "Aircraft"}` : "The world above, in real time"}</span>
          <span>{place ? "Updated every 30 seconds" : "Made for looking up"}</span>
        </div>
      </section>

      {place && <FlightMap key={`${place.lat},${place.lon}`} lat={place.lat} lon={place.lon} aircraft={sky?.aircraft ?? []} closestHex={sky?.flight?.hex ?? null} loading={status === "loading"} unavailable={status === "error" || Boolean(flightUnavailable)} />}

      <section className="info-section" aria-label="Sky details">
        <div className="info-heading">
          <h2>{flight ? "The flight, at a glance" : "Your sky, at a glance"}</h2>
          <button className="refresh-button" onClick={() => place ? void loadSky(place) : locate()} disabled={status === "loading" || status === "locating"}>
            <RefreshCw size={16} className={status === "loading" ? "spinning" : ""} /> Refresh sky
          </button>
        </div>

        <div className="details-layout">
          <article className="detail-panel flight-panel">
            <div className="detail-title"><Navigation2 size={18} strokeWidth={1.8} /><h3>Flight</h3></div>
            {flight ? <>
              <div className="airport-row">
                <div><strong className="airport-code">{flight.origin?.code ?? "···"}</strong><span className="airport-city">{flight.origin?.city ?? "Origin unavailable"}</span></div>
                <ArrowRight className="airport-connector" size={25} strokeWidth={1.3} aria-hidden="true" />
                <div><strong className="airport-code">{flight.destination?.code ?? "···"}</strong><span className="airport-city">{flight.destination?.city ?? "Destination unavailable"}</span></div>
              </div>
              <div className="stat-row">
                <div><span>Altitude</span><strong>{numberOrDash(flight.altitudeFt, "ft")}</strong></div>
                <div><span>Ground speed</span><strong>{numberOrDash(flight.speedKts, "kt")}</strong></div>
                <div><span>Distance</span><strong>{flight.distanceKm.toFixed(1)} km</strong></div>
              </div>
              <p className="data-note">{routeNote(flight)} · Position received {Math.round(flight.seenSeconds)} sec ago</p>
            </> : <p className="empty-copy">{place ? "No nearby aircraft detected. The sky can change in a moment." : "Find your location to meet the flight closest to you."}</p>}
          </article>

          <article className="detail-panel weather-panel">
            <div className="detail-title"><CloudSun size={19} strokeWidth={1.8} /><h3>Weather</h3></div>
            <div className="weather-main"><strong className="weather-temp">{weather ? `${Math.round(weather.temperatureF)}°` : "—°"}</strong><div><strong>{weather ? weatherDescription(weather.code) : "Waiting for location"}</strong><span>Above your location</span></div></div>
            <div className="weather-stats">
              <span><CloudSun size={17} /> Cloud cover <strong>{weather ? `${weather.cloudCover}%` : "—"}</strong></span>
              <span><Wind size={17} /> Wind <strong>{weather ? `${Math.round(weather.windMph)} mph` : "—"}</strong></span>
            </div>
          </article>
        </div>

        {notice && <p className="status-message" role="status">{notice}</p>}
        <div className="location-tools">
          <button className="text-button" onClick={() => setManual(!manual)} aria-expanded={manual}>{manual ? "Hide manual location" : "Enter coordinates instead"} <ArrowRight size={16} /></button>
          {place && <span className="update-note">Updated {sky ? new Date(sky.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "just now"} · {sky?.nearbyCount ?? 0} nearby aircraft</span>}
        </div>
        {manual && <form className="manual-form" onSubmit={submitCoordinates}>
          <label>Latitude<input type="number" step="any" min="-90" max="90" placeholder="41.8781" value={lat} onChange={event => setLat(event.target.value)} required /></label>
          <label>Longitude<input type="number" step="any" min="-180" max="180" placeholder="-87.6298" value={lon} onChange={event => setLon(event.target.value)} required /></label>
          <button type="submit">Show this sky</button>
        </form>}
      </section>

      <footer className="site-footer"><span className="footer-brand">overhead<span className="brand-period">.</span></span><span>Flight positions: adsb.fi · Routes: adsbdb &amp; AirLabs · Weather: Open-Meteo · Map: OpenStreetMap</span></footer>
    </main>
  );
}
