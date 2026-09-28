"use client";

import { useEffect, useState } from "react";

const QUIET_HEADING = "A quiet sky.\nFor now.";
type FlipState = { text: string; from: string | null; sequence: number; delayMs: number };

export default function FlipHeading({ text }: { text: string }) {
  const [flip, setFlip] = useState<FlipState>(() => ({ text, from: null, sequence: 0, delayMs: 0 }));

  if (flip.text !== text) {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFlip({ text, from: reduceMotion ? null : flip.text, sequence: flip.sequence + 1, delayMs: text === QUIET_HEADING || flip.text === QUIET_HEADING ? 300 : 0 });
  }

  useEffect(() => {
    if (!flip.from) return;
    const timeout = window.setTimeout(() => {
      setFlip((current) => current.sequence === flip.sequence ? { ...current, from: null } : current);
    }, 740 + flip.delayMs);
    return () => window.clearTimeout(timeout);
  }, [flip.from, flip.sequence, flip.delayMs]);

  return <h1 id="hero-title" className="boarding-pass-heading" aria-label={text.replace("\n", " ")}>
    <span className="flip-heading" aria-hidden="true">
      <span className="flip-heading-half flip-heading-top"><span>{text}</span></span>
      <span className="flip-heading-half flip-heading-bottom"><span>{flip.from ?? text}</span></span>
      {flip.from && <span className={`flip-heading-motion ${flip.delayMs ? "flip-heading-delayed" : ""}`} key={flip.sequence}>
        <span className="flip-heading-half flip-heading-top flip-heading-old"><span>{flip.from}</span></span>
        <span className="flip-heading-half flip-heading-bottom flip-heading-new"><span>{text}</span></span>
      </span>}
    </span>
  </h1>;
}
