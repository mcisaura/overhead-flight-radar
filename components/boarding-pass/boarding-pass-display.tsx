"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { BoardingPassActionSizeContext, type ActionSize } from "./boarding-pass-actions";

type Props = {
  displayKey: string;
  active: boolean;
  children: ReactNode;
  onDisplayed?: (displayKey: string) => void;
};
type Snapshot = { element: HTMLElement; left: number; top: number; width: number; height: number };
const contentSelector = ".hero-flight-identity, .boarding-route, .boarding-pass-route-note, .boarding-pass-stub-codes, .hero-description, .boarding-pass-stats";

export default function BoardingPassDisplay({ displayKey, active, children, onDisplayed }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const actionSize = useRef<ActionSize | null>(null);
  const previous = useRef({ displayKey, active });
  const snapshots = useRef<Snapshot[]>([]);
  const onDisplayedRef = useRef(onDisplayed);

  useLayoutEffect(() => { onDisplayedRef.current = onDisplayed; }, [onDisplayed]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(contentSelector));
    const bounds = root.getBoundingClientRect();
    const outgoing = snapshots.current;
    // Retain inert visual copies of details, never controls or headings.
    snapshots.current = elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { element: element.cloneNode(true) as HTMLElement, left: rect.left - bounds.left - root.clientLeft, top: rect.top - bounds.top - root.clientTop, width: rect.width, height: rect.height };
    });
    if (previous.current.displayKey === displayKey) return;
    const stateChanged = previous.current.active !== active;
    const aircraftChanged = previous.current.displayKey.split(":", 1)[0] !== displayKey.split(":", 1)[0];
    previous.current = { displayKey, active };

    if ((!stateChanged && !aircraftChanged) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDisplayedRef.current?.(displayKey);
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "boarding-pass-outgoing";
    overlay.setAttribute("aria-hidden", "true");
    overlay.inert = true;
    for (const snapshot of outgoing) {
      const copy = snapshot.element;
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
      Object.assign(copy.style, { position: "absolute", left: `${snapshot.left}px`, top: `${snapshot.top}px`, width: `${snapshot.width}px`, height: `${snapshot.height}px`, margin: "0" });
      if (copy.matches(".boarding-pass-stats")) {
        // Keep the compact measurement styles on the outgoing visual copy.
        const host = document.createElement("div");
        host.className = "hero-flight-details";
        host.style.display = "contents";
        host.appendChild(copy);
        overlay.appendChild(host);
      } else overlay.appendChild(copy);
    }
    root.appendChild(overlay);
    const timing = { duration: 280, easing: "ease-out" };
    const animations = elements.map((element) => element.animate(
      element.matches(".boarding-pass-stats")
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], timing,
    ));
    animations.push(overlay.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: "forwards" }));
    void Promise.all(animations.map((animation) => animation.finished)).then(() => {
      overlay.remove();
      onDisplayedRef.current?.(displayKey);
    }).catch(() => {});
    return () => {
      animations.forEach((animation) => animation.cancel());
      overlay.remove();
    };
  }, [displayKey, active]);

  // Keep the eventual exit fade's numbers current without replaying their animation.
  useLayoutEffect(() => {
    const stats = rootRef.current?.querySelector<HTMLElement>(".boarding-pass-display .boarding-pass-stats");
    const snapshot = snapshots.current.find((item) => item.element.matches(".boarding-pass-stats"));
    if (stats && snapshot) snapshot.element = stats.cloneNode(true) as HTMLElement;
  }, [children]);

  return <BoardingPassActionSizeContext.Provider value={actionSize}><div className={`hero-inner boarding-pass ${active ? "hero-flight" : "empty-boarding-pass"}`} ref={rootRef}>
    <div className="boarding-pass-display">{children}</div>
  </div></BoardingPassActionSizeContext.Provider>;
}
