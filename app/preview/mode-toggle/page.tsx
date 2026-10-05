"use client";

import { useState } from "react";
import Link from "next/link";
import DemoSky from "../../../components/sky/demo-sky";
import InstrumentModeToggle from "../../../components/controls/instrument-mode-toggle";
import type { HeroBackground } from "../../../components/controls/hero-background-toggle";
import { ChoiceMotionProvider } from "../../../components/controls/sliding-choice-group";
import type { WeatherUnit } from "../../../lib/weather-units";

export default function ModeTogglePreview() {
  const [mode, setMode] = useState<"live" | "demo">("demo");
  const [weatherUnit, setWeatherUnit] = useState<WeatherUnit>("imperial");
  const [heroBackground, setHeroBackground] = useState<HeroBackground>("original");

  return <ChoiceMotionProvider>
    <aside className="instrument-preview-note" aria-label="Concept preview">
      <span>Aviation switch concept · sample sky</span>
      <Link href="/?mode=demo" prefetch={false}>Back to main demo ↗</Link>
    </aside>
    <DemoSky onModeChange={setMode} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit}
      heroBackground={heroBackground} onHeroBackgroundChange={setHeroBackground}
      headerModeControl={<InstrumentModeToggle mode={mode} onChange={setMode} />} />
  </ChoiceMotionProvider>;
}
