import type { WeatherUnit } from "../../lib/weather-units";
import SlidingChoiceGroup from "./sliding-choice-group";

export default function WeatherUnitToggle({ value, onChange }: { value: WeatherUnit; onChange: (unit: WeatherUnit) => void }) {
  return <div className="weather-unit-control">
    <span>Weather units</span>
    <SlidingChoiceGroup className="weather-unit-toggle" label="Weather units" motionKey="weather-unit" selectedIndex={value === "imperial" ? 0 : 1}>
      <button type="button" aria-pressed={value === "imperial"} onClick={() => onChange("imperial")}>°F</button>
      <button type="button" aria-pressed={value === "metric"} onClick={() => onChange("metric")}>°C</button>
    </SlidingChoiceGroup>
  </div>;
}
