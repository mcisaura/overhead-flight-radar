"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Position = { index: number; left: number; width: number };
const ChoiceMotionContext = createContext<Map<string, Position> | null>(null);

export function ChoiceMotionProvider({ children }: { children: ReactNode }) {
  const [positions] = useState(() => new Map<string, Position>());
  return <ChoiceMotionContext.Provider value={positions}>{children}</ChoiceMotionContext.Provider>;
}

export default function SlidingChoiceGroup({ className, label, motionKey, selectedIndex, children }: {
  className: string;
  label: string;
  motionKey: string;
  selectedIndex: 0 | 1;
  children: ReactNode;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const sharedPositions = useContext(ChoiceMotionContext);
  const [localPositions] = useState(() => new Map<string, Position>());
  const positions = sharedPositions ?? localPositions;

  useLayoutEffect(() => {
    const group = groupRef.current;
    const pill = pillRef.current;
    if (!group || !pill) return;
    const measure = () => {
      const selected = group.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      if (!selected) return;
      const previous = positions.get(motionKey);
      const next = { index: selectedIndex, left: selected.offsetLeft, width: selected.offsetWidth };
      if (previous?.index === next.index && previous.left === next.left && previous.width === next.width
        && pill.style.top === `${selected.offsetTop}px` && pill.style.height === `${selected.offsetHeight}px`) return;
      // Continue a rapid switch from the pill's current visual position.
      const visual = animationRef.current ? pill.getBoundingClientRect() : null;
      const groupBounds = visual ? group.getBoundingClientRect() : null;
      animationRef.current?.cancel();
      animationRef.current = null;
      Object.assign(pill.style, {
        left: `${next.left}px`, top: `${selected.offsetTop}px`, width: `${next.width}px`,
        height: `${selected.offsetHeight}px`, bottom: "auto", transform: "none",
      });
      positions.set(motionKey, next);
      if (!previous || previous.index === next.index || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const fromLeft = visual && groupBounds ? visual.left - groupBounds.left - group.clientLeft : previous.left;
      const fromWidth = visual?.width ?? previous.width;
      const animation = pill.animate([
        { transform: `translateX(${fromLeft - next.left}px) scaleX(${fromWidth / next.width})` },
        { transform: "translateX(0) scaleX(1)" },
      ], { duration: 320, easing: "cubic-bezier(.22, 1, .36, 1)" });
      animationRef.current = animation;
      void animation.finished.then(() => {
        if (animationRef.current === animation) animationRef.current = null;
      }).catch(() => {});
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => observer.disconnect();
  }, [motionKey, positions, selectedIndex]);

  useLayoutEffect(() => () => animationRef.current?.cancel(), []);

  return <div ref={groupRef} className={`${className} sliding-choice-group`} role="group" aria-label={label}>
    <span ref={pillRef} className="choice-selection-pill" aria-hidden="true" style={{ "--selection-index": selectedIndex } as CSSProperties} />
    {children}
  </div>;
}
