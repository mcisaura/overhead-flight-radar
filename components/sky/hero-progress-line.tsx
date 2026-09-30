"use client";

import { useEffect, useRef, useState } from "react";
import ProgressWalker from "./progress-walker";

type HeroProgressLineProps = {
  progress: number | null;
  label: string;
  valueText: string;
  live?: boolean;
};

function walkerPositionForProgress(progress: number) {
  const crossing = Math.max(0, Math.min(100, progress));
  if (crossing < 50) return crossing;
  if (crossing < 60) return 50;
  return 50 * (100 - crossing) / 40;
}

export default function HeroProgressLine({ progress, label, valueText, live = false }: HeroProgressLineProps) {
  const initialPosition = walkerPositionForProgress(progress ?? 0);
  const [walkerProgress, setWalkerProgress] = useState(initialPosition);
  const walkerPosition = useRef(initialPosition);
  const walkerTarget = useRef(initialPosition);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (progress == null) return;
    walkerTarget.current = walkerPositionForProgress(progress);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      walkerPosition.current = walkerTarget.current;
      setWalkerProgress(walkerTarget.current);
      return;
    }
    if (frameRef.current) return;
    lastTimeRef.current = 0;
    const move = (time: number) => {
      frameRef.current = 0;
      const deltaMs = lastTimeRef.current ? Math.min(time - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = time;
      const target = walkerTarget.current;
      const next = Math.abs(target - walkerPosition.current) < 0.03
        ? target
        : walkerPosition.current + (target - walkerPosition.current) * (1 - Math.exp(-deltaMs / 250));
      if (next !== walkerPosition.current) {
        walkerPosition.current = next;
        setWalkerProgress(next);
      }
      if (Math.abs(walkerTarget.current - walkerPosition.current) > 0.001) {
        frameRef.current = window.requestAnimationFrame(move);
      }
    };
    frameRef.current = window.requestAnimationFrame(move);
  }, [progress]);

  useEffect(() => () => {
    window.cancelAnimationFrame(frameRef.current);
  }, []);

  const pointing = progress != null && progress >= 40 && progress < 60;
  const paused = progress != null && ((progress >= 50 && progress < 60 && walkerProgress >= 49.5) || (progress >= 100 && walkerProgress <= 0.5));
  const returning = progress != null && progress >= 60;
  return <div className={`hero-baseline hero-progress-baseline ${live ? "is-live" : ""}`}>
    <div className="hero-baseline-track" role={progress == null ? undefined : "progressbar"} aria-label={progress == null ? `${label}: progress unavailable until a heading is reported` : label} aria-valuemin={progress == null ? undefined : 0} aria-valuemax={progress == null ? undefined : 100} aria-valuenow={progress == null ? undefined : Number(progress.toFixed(1))} aria-valuetext={progress == null ? undefined : valueText}>
      {progress != null && <><span className="hero-baseline-fill" style={{ width: `${progress}%` }} /><ProgressWalker progress={walkerProgress} pointing={pointing} paused={paused} returning={returning} /></>}
    </div>
    <span className="hero-baseline-percent" aria-hidden="true">{progress == null ? "—" : `${Math.round(progress)}%`}</span>
  </div>;
}
