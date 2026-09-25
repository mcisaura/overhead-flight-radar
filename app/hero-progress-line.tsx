"use client";

import { useEffect, useRef, useState } from "react";
import ProgressWalker from "./progress-walker";

type HeroProgressLineProps = {
  progress: number | null;
  label: string;
  valueText: string;
  live?: boolean;
};

function easedWalkerProgress(progress: number) {
  if (progress < 40 || progress >= 60) return progress;
  if (progress < 50) {
    const t = (progress - 40) / 10;
    return 40 + 10 * (t + t * t - t * t * t);
  }
  const t = (progress - 50) / 10;
  return 50 + 10 * (2 * t * t - t * t * t);
}

export default function HeroProgressLine({ progress, label, valueText, live = false }: HeroProgressLineProps) {
  const previousProgress = useRef<number | null>(null);
  const pausedThisCrossing = useRef(false);
  const [holdingAtCenter, setHoldingAtCenter] = useState(false);
  const [walkerProgress, setWalkerProgress] = useState(progress ?? 0);
  const walkerPosition = useRef(progress ?? 0);
  const walkerTarget = useRef(progress ?? 0);

  useEffect(() => {
    if (progress == null || progress < 40) pausedThisCrossing.current = false;
    const previous = previousProgress.current;
    if (progress != null && progress < 60 && previous !== null && previous < 50 && progress >= 50 && !pausedThisCrossing.current) {
      pausedThisCrossing.current = true;
      setHoldingAtCenter(true);
    }
    previousProgress.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!holdingAtCenter) return;
    const timer = window.setTimeout(() => setHoldingAtCenter(false), 1200);
    return () => window.clearTimeout(timer);
  }, [holdingAtCenter]);

  useEffect(() => {
    if (progress == null) return;
    const target = holdingAtCenter ? 50 : easedWalkerProgress(progress);
    if (progress < 40 && walkerPosition.current > 60) {
      walkerPosition.current = progress;
      setWalkerProgress(progress);
    }
    walkerTarget.current = target;
  }, [progress, holdingAtCenter]);

  useEffect(() => {
    let frame = 0;
    let lastTime = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (time: number) => {
      const deltaMs = lastTime ? Math.min(time - lastTime, 50) : 16;
      lastTime = time;
      const target = walkerTarget.current;
      const next = reducedMotion || Math.abs(target - walkerPosition.current) < 0.03
        ? target
        : walkerPosition.current + (target - walkerPosition.current) * (1 - Math.exp(-deltaMs / 250));
      if (next !== walkerPosition.current) {
        walkerPosition.current = next;
        setWalkerProgress(next);
      }
      frame = window.requestAnimationFrame(move);
    };
    frame = window.requestAnimationFrame(move);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const pointing = walkerProgress >= 40 && walkerProgress < 60;
  return <div className={`hero-baseline hero-progress-baseline ${live ? "is-live" : ""}`}>
    <div className="hero-baseline-track" role={progress == null ? undefined : "progressbar"} aria-label={progress == null ? `${label}: progress unavailable until a heading is reported` : label} aria-valuemin={progress == null ? undefined : 0} aria-valuemax={progress == null ? undefined : 100} aria-valuenow={progress == null ? undefined : Number(progress.toFixed(1))} aria-valuetext={progress == null ? undefined : valueText}>
      {progress != null && <><span className="hero-baseline-fill" style={{ width: `${progress}%` }} /><ProgressWalker progress={walkerProgress} pointing={pointing} /></>}
    </div>
    <span className="hero-baseline-percent" aria-hidden="true">{progress == null ? "—" : `${Math.round(progress)}%`}</span>
  </div>;
}
