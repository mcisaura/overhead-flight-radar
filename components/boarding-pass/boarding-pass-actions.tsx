"use client";

import { createContext, useContext, useLayoutEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import BoardingBarcode from "./boarding-barcode";

export type ActionSize = { width: number; height: number; primaryWidth: number; primaryHeight: number };
export const BoardingPassActionSizeContext = createContext<MutableRefObject<ActionSize | null> | null>(null);

export default function BoardingPassActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  const sharedSize = useContext(BoardingPassActionSizeContext);
  const shellRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const buttons = buttonsRef.current;
    if (!shell || !buttons) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    let resizing = false;
    let disposed = false;
    let resizeFrame = 0;
    let target: ActionSize | null = null;
    const resize = () => {
      if (resizing || disposed) return;
      const primary = buttons.querySelector("button");
      if (!primary) return;
      const rect = buttons.getBoundingClientRect();
      const primaryRect = primary.getBoundingClientRect();
      const next = { width: rect.width, height: rect.height, primaryWidth: primaryRect.width, primaryHeight: primaryRect.height };
      if (target && Math.abs(next.width - target.width) < .5 && Math.abs(next.height - target.height) < .5) return;
      const shellRect = shell.getBoundingClientRect();
      const current = target ? { width: shellRect.width, height: shellRect.height, primaryWidth: target.primaryWidth, primaryHeight: target.primaryHeight } : sharedSize?.current;
      animations.forEach((animation) => animation.cancel());
      target = next;
      shell.style.width = `${next.width}px`;
      shell.style.height = `${next.height}px`;
      if (sharedSize) sharedSize.current = next;
      if (!current || motion.matches || (Math.abs(current.width - next.width) < .5 && Math.abs(current.height - next.height) < .5)) return;
      resizing = true;
      animations = [shell.animate([
        { width: `${current.width}px`, height: `${current.height}px`, offset: 0 },
        { width: `${next.width}px`, height: `${next.height}px`, offset: 1 },
      ], { duration: 480, easing: "cubic-bezier(0.65, 0, 0.35, 1)" }), primary.animate([
        { width: `${current.primaryWidth}px`, height: `${current.primaryHeight}px`, offset: 0 },
        { width: `${next.primaryWidth}px`, height: `${next.primaryHeight}px`, offset: 1 },
      ], { duration: 480, easing: "cubic-bezier(0.65, 0, 0.35, 1)" })];
      void Promise.all(animations.map((animation) => animation.finished)).then(() => {
        resizing = false;
        resize();
      }).catch(() => { resizing = false; });
    };
    const stopMotion = () => {
      if (motion.matches) {
        animations.forEach((animation) => animation.cancel());
        resizing = false;
        resize();
      }
    };
    resize();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    observer.observe(buttons);
    motion.addEventListener("change", stopMotion);
    return () => {
      const rect = shell.getBoundingClientRect();
      const primary = buttons.querySelector("button")?.getBoundingClientRect();
      if (sharedSize && primary) sharedSize.current = { width: rect.width, height: rect.height, primaryWidth: primary.width, primaryHeight: primary.height };
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      motion.removeEventListener("change", stopMotion);
      animations.forEach((animation) => animation.cancel());
    };
  }, [sharedSize]);

  return <div className={`boarding-pass-actions ${className}`}>
    <div className="boarding-pass-buttons-shell" ref={shellRef}>
      <div className="boarding-pass-action-buttons" ref={buttonsRef}>{children}</div>
    </div>
    <BoardingBarcode />
  </div>;
}
