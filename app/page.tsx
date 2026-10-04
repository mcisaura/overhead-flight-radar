"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import LiveSky, { type Place } from "../components/sky/live-sky";
import DemoSky from "../components/sky/demo-sky";
import { demoPlace } from "../lib/demo-data";
import type { WeatherUnit } from "../lib/weather-units";
import type { HeroBackground } from "../components/controls/hero-background-toggle";

function SkyHome() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"live" | "demo">(() => searchParams.get("mode") === "demo" ? "demo" : "live");
  const [place, setPlace] = useState<Place>({ lat: demoPlace.lat, lon: demoPlace.lon, label: "Houston · live sky", sample: true });
  const [weatherUnit, setWeatherUnit] = useState<WeatherUnit>("imperial");
  const [heroBackground, setHeroBackground] = useState<HeroBackground>("original");
  return mode === "live"
    ? <LiveSky onModeChange={setMode} place={place} onPlaceChange={setPlace} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} heroBackground={heroBackground} onHeroBackgroundChange={setHeroBackground} />
    : <DemoSky onModeChange={setMode} weatherUnit={weatherUnit} onWeatherUnitChange={setWeatherUnit} heroBackground={heroBackground} onHeroBackgroundChange={setHeroBackground} />;
}

export default function Home() {
  return <Suspense fallback={null}><SkyHome /></Suspense>;
}
