export type WeatherUnit = "imperial" | "metric";

export function formatTemperature(fahrenheit: number, unit: WeatherUnit) {
  return unit === "metric"
    ? `${Math.round((fahrenheit - 32) * 5 / 9)}°C`
    : `${Math.round(fahrenheit)}°F`;
}

export function formatWind(mph: number, unit: WeatherUnit) {
  return unit === "metric"
    ? `${Math.round(mph * 1.609344)} km/h`
    : `${Math.round(mph)} mph`;
}
