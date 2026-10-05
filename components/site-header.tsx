import { CloudSun, MapPin, Navigation2 } from "lucide-react";
import type { ReactNode } from "react";
import ModeToggle from "./controls/mode-toggle";
import type { SkyResponse } from "../lib/sky-contract";
import { formatTemperature, formatWind, type WeatherUnit } from "../lib/weather-units";

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

export default function SiteHeader({ mode, onModeChange, placeLabel, weather, weatherUnit, loading = false, modeControl }: {
  mode: "live" | "demo";
  onModeChange: (mode: "live" | "demo") => void;
  placeLabel: string;
  weather: SkyResponse["weather"];
  weatherUnit: WeatherUnit;
  loading?: boolean;
  modeControl?: ReactNode;
}) {
  const source = mode === "demo" ? "Sample weather" : "Live weather";
  const condition = weather ? weatherLabel(weather.code) : loading ? "Loading weather…" : "Unavailable";
  const temperature = weather ? formatTemperature(weather.temperatureF, weatherUnit) : `—°${weatherUnit === "imperial" ? "F" : "C"}`;

  return <header className="topbar">
    <div className="topbar-main">
      <div className="brand"><span className="brand-mark"><Navigation2 size={19} strokeWidth={1.9} /></span><span>overhead<span className="brand-period">.</span></span></div>
      <div className="header-weather" aria-label={`${source}: ${condition}`} aria-busy={loading && !weather}>
        <CloudSun size={19} strokeWidth={1.8} aria-hidden="true" />
        <strong className="header-weather-temp">{temperature}</strong>
        <span className="header-weather-condition" title={`${condition} · ${source}`}><span>{condition}</span><small>{source}</small></span>
        <span className="header-weather-stat header-weather-cloud">Cloud {weather ? `${weather.cloudCover}%` : "—"}</span>
        <span className="header-weather-stat header-weather-wind">Wind {weather ? formatWind(weather.windMph, weatherUnit) : "—"}</span>
      </div>
      <div className="topbar-right">
        {modeControl ?? <ModeToggle mode={mode} onChange={onModeChange} />}
        <span className="top-divider" />
        <span className="topbar-place" title={placeLabel}><MapPin size={15} /><span className="topbar-place-text">{placeLabel.split(" · ")[0]}</span></span>
      </div>
    </div>
  </header>;
}
