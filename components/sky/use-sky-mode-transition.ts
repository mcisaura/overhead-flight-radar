"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import { animateSkyModeChange } from "../../lib/sky-mode-motion";

type Mode = "live" | "demo";

export default function useSkyModeTransition(rootRef: RefObject<HTMLDivElement | null>, currentMode: Mode, setMode: (mode: Mode) => void) {
  const cancelRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cancelRef.current?.(), []);

  return useCallback((mode: Mode) => {
    if (mode === currentMode) return;
    cancelRef.current?.();
    const root = rootRef.current;
    const restoreFocus = Boolean(document.activeElement?.closest(".mode-toggle"));
    cancelRef.current = animateSkyModeChange(root, () => {
      flushSync(() => setMode(mode));
      if (restoreFocus) root?.querySelector<HTMLButtonElement>('.mode-toggle button[aria-pressed="true"]')?.focus({ preventScroll: true });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [currentMode, rootRef, setMode]);
}
