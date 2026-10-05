import { ChevronUp } from "lucide-react";
import HeroBackgroundToggle, { type HeroBackground } from "./controls/hero-background-toggle";
import ThemeToggle from "./controls/theme-toggle";
import WeatherUnitToggle from "./controls/weather-unit-toggle";
import ProjectCredits from "./project-credits";
import type { WeatherUnit } from "../lib/weather-units";

export default function SiteFooter({ heroBackground, onHeroBackgroundChange, weatherUnit, onWeatherUnitChange }: {
  heroBackground: HeroBackground;
  onHeroBackgroundChange: (background: HeroBackground) => void;
  weatherUnit: WeatherUnit;
  onWeatherUnitChange: (unit: WeatherUnit) => void;
}) {
  return <footer className="site-footer">
    <span className="footer-brand">overhead<span className="brand-period">.</span></span>
    <div className="footer-settings" role="group" aria-label="Display preferences">
      <HeroBackgroundToggle value={heroBackground} onChange={onHeroBackgroundChange} />
      <WeatherUnitToggle value={weatherUnit} onChange={onWeatherUnitChange} />
      <div className="footer-theme-control"><span>Appearance</span><ThemeToggle /></div>
    </div>
    <details className="footer-credits" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary>Credits<ChevronUp size={13} aria-hidden="true" /></summary>
      <ProjectCredits />
    </details>
  </footer>;
}
