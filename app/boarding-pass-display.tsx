"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Display = { displayKey: string; active: boolean; children: ReactNode };

export default function BoardingPassDisplay({ displayKey, active, children }: Display) {
  const requested = useRef<Display>({ displayKey, active, children });
  const shownKey = useRef(displayKey);
  const [shown, setShown] = useState<Display>({ displayKey, active, children });
  const [phase, setPhase] = useState<"idle" | "closing" | "opening">("idle");

  useEffect(() => {
    requested.current = { displayKey, active, children };
  }, [displayKey, active, children]);

  useEffect(() => {
    if (displayKey === shownKey.current) {
      setPhase("idle");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownKey.current = displayKey;
      setShown(requested.current);
      setPhase("idle");
      return;
    }
    setPhase("closing");
    const timer = window.setTimeout(() => {
      shownKey.current = requested.current.displayKey;
      setShown(requested.current);
      setPhase("opening");
    }, 160);
    return () => window.clearTimeout(timer);
  }, [displayKey]);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(() => setPhase("idle"), 300);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const current = shown.displayKey === displayKey ? { active, children } : shown;
  return <div className={`hero-inner boarding-pass ${current.active ? "hero-flight" : "empty-boarding-pass"}`}>
    <div className={`boarding-pass-display flap-${phase}`}>{current.children}</div>
  </div>;
}
