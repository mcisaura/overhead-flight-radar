"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import LiveSky, { type Place } from "../components/sky/live-sky";
import DemoSky from "../components/sky/demo-sky";
import { demoPlace } from "../lib/demo-data";
import type { WeatherUnit } from "../lib/weather-units";
import type { HeroBackground } from "../components/controls/hero-background-toggle";
import { ChoiceMotionProvider } from "../components/controls/sliding-choice-group";
import useSkyModeTransition from "../components/sky/use-sky-mode-transition";

function SkyHome() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"live" | "demo">(() => searchParams.get("mode") === "demo" ? "demo" : "live");
  const [place, setPlace] = useState<Place>({ lat: demoPlace.lat, lon: demoPlace.lon, label: "Houston · live sky", sample: true });
  const [weatherUnit, setWeatherUnit] = useState<WeatherUnit>("imperial");
  const [heroBackground, setHeroBackground] = useState<HeroBackground>("original");
  const viewRef = useRef<HTMLDivElement>(null);
  const changeMode = useSkyModeTransition(viewRef, mode, setMode);
  return <ChoiceMotionProvider><div ref={viewRef} className="sky-mode-view">{mode === "live"
    ? <LiveSky onModeChange={changeMode} place={place} onPlaceChange={setPlace} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} heroBackground={heroBackground} onHeroBackgroundChange={setHeroBackground} />
    : <DemoSky onModeChange={changeMode} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} heroBackground={heroBackground} onHeroBackgroundChange={setHeroBackground} />}</div></ChoiceMotionProvider>;
}

export default function Home() {
  return <Suspense fallback={null}><SkyHome /></Suspense>;
}
