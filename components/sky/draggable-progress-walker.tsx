"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import ProgressWalker from "./progress-walker";
import { walkerDropPosition, walkerLandingPoint, walkerProgressAtX, type WalkerPoint } from "../../lib/walker-drag";

type Props = {
  progress: number;
  paused: boolean;
  trackRef: RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onChange: (progress: number) => void;
  onEnd: () => void;
};
type Grab = { pointerId: number; element: HTMLButtonElement; offsetX: number; offsetY: number };

export default function DraggableProgressWalker({ progress, paused, trackRef, onStart, onChange, onEnd }: Props) {
  const controlRef = useRef<HTMLButtonElement>(null);
  const grabRef = useRef<Grab | null>(null);
  const floatingRef = useRef<WalkerPoint | null>(null);
  const progressRef = useRef(progress);
  const frameRef = useRef(0);
  const onEndRef = useRef(onEnd);
  const [floating, setFloating] = useState<WalkerPoint | null>(null);

  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  const finish = useCallback(() => {
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    const grab = grabRef.current;
    grabRef.current = null;
    if (grab?.element.hasPointerCapture(grab.pointerId)) grab.element.releasePointerCapture(grab.pointerId);
    floatingRef.current = null;
    setFloating(null);
    onEndRef.current();
  }, []);

  useEffect(() => {
    const cancel = () => { if (floatingRef.current) finish(); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.cancelAnimationFrame(frameRef.current);
      const grab = grabRef.current;
      grabRef.current = null;
      if (grab?.element.hasPointerCapture(grab.pointerId)) grab.element.releasePointerCapture(grab.pointerId);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [finish]);

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || grabRef.current || !trackRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    window.cancelAnimationFrame(frameRef.current);
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top };
    grabRef.current = { pointerId: event.pointerId, element: event.currentTarget, offsetX: event.clientX - point.x, offsetY: event.clientY - point.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    controlRef.current?.focus({ preventScroll: true });
    floatingRef.current = point;
    setFloating(point);
    onStart();
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const grab = grabRef.current;
    const track = trackRef.current?.getBoundingClientRect();
    if (!grab || grab.pointerId !== event.pointerId || !track) return;
    event.preventDefault();
    event.stopPropagation();
    const x = Math.max(22, Math.min(window.innerWidth - 22, event.clientX - grab.offsetX));
    const next = walkerProgressAtX(x, track);
    const landing = walkerLandingPoint(next, track);
    const point = { x, y: Math.min(landing.y, Math.max(0, event.clientY - grab.offsetY)) };
    floatingRef.current = point;
    progressRef.current = next;
    setFloating(point);
    onChange(next);
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    const grab = grabRef.current;
    if (!grab || grab.pointerId !== event.pointerId) return;
    move(event);
    grabRef.current = null;
    if (grab.element.hasPointerCapture(grab.pointerId)) grab.element.releasePointerCapture(grab.pointerId);
    const start = floatingRef.current;
    if (!start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    const startedAt = performance.now();
    const fall = (time: number) => {
      const track = trackRef.current?.getBoundingClientRect();
      if (!track) { finish(); return; }
      const next = walkerDropPosition(start, walkerLandingPoint(progressRef.current, track), time - startedAt);
      if (next.landed) { finish(); return; }
      floatingRef.current = next;
      setFloating(next);
      frameRef.current = window.requestAnimationFrame(fall);
    };
    frameRef.current = window.requestAnimationFrame(fall);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? 100
      : ["ArrowRight", "ArrowUp"].includes(event.key) ? progress + step
      : ["ArrowLeft", "ArrowDown"].includes(event.key) ? progress - step : null;
    if (next === null) return;
    event.preventDefault();
    onStart();
    onChange(Math.max(0, Math.min(100, next)));
    finish();
  }

  const pointerHandlers = {
    onPointerDown: pointerDown, onPointerMove: move, onPointerUp: release,
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => { if (grabRef.current?.pointerId === event.pointerId) finish(); },
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => { if (grabRef.current?.pointerId === event.pointerId) finish(); },
  };
  return <>
    <button ref={controlRef} type="button" role="slider" className="progress-walker-control"
      aria-label="Drag the character to preview flight progress" aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${Math.round(progress)}% through the flight`}
      title="Drag left or right to scrub. Lift and release to drop."
      style={{ left: `calc(${progress}% + ${15 - .3 * progress}px)`, opacity: floating ? 0 : 1, pointerEvents: floating ? "none" : undefined }}
      onKeyDown={keyDown} {...pointerHandlers}>
      <ProgressWalker progress={50} pointing={progress >= 40 && progress < 60} paused={paused} returning={false} />
    </button>
    {floating && createPortal(<button type="button" className="progress-walker-ghost" aria-hidden="true" tabIndex={-1}
      style={{ left: floating.x, top: floating.y }} {...pointerHandlers}>
      <ProgressWalker progress={50} pointing={false} paused returning={false} />
    </button>, document.body)}
  </>;
}
