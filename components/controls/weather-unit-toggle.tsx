import type { WeatherUnit } from "../../lib/weather-units";

export default function WeatherUnitToggle({ value, onChange }: { value: WeatherUnit; onChange: (unit: WeatherUnit) => void }) {
  return <div className="weather-unit-control">
    <span>Weather units</span>
    <div className="weather-unit-toggle" role="group" aria-label="Weather units">
      <button type="button" aria-pressed={value === "imperial"} onClick={() => onChange("imperial")}>°F</button>
      <button type="button" aria-pressed={value === "metric"} onClick={() => onChange("metric")}>°C</button>
    </div>
  </div>;
}
