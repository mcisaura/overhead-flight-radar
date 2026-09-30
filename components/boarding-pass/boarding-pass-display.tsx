"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  displayKey: string;
  active: boolean;
  children: ReactNode;
  onDisplayed?: (displayKey: string) => void;
};

export default function BoardingPassDisplay({ displayKey, active, children, onDisplayed }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previous = useRef({ displayKey, active });
  const onDisplayedRef = useRef(onDisplayed);

  useLayoutEffect(() => { onDisplayedRef.current = onDisplayed; }, [onDisplayed]);

  useLayoutEffect(() => {
    if (previous.current.displayKey === displayKey) return;
    const stateChanged = previous.current.active !== active;
    const aircraftChanged = previous.current.displayKey.split(":", 1)[0] !== displayKey.split(":", 1)[0];
    previous.current = { displayKey, active };

    if ((!stateChanged && !aircraftChanged) || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !rootRef.current) {
      onDisplayedRef.current?.(displayKey);
      return;
    }

    const animation = rootRef.current.animate(
      [{ opacity: 0.12 }, { opacity: 1 }],
      { duration: 280, easing: "ease-out" },
    );
    void animation.finished.then(() => onDisplayedRef.current?.(displayKey)).catch(() => {});
    return () => animation.cancel();
  }, [displayKey, active]);

  return <div className={`hero-inner boarding-pass ${active ? "hero-flight" : "empty-boarding-pass"}`} ref={rootRef}>
    <div className="boarding-pass-display">{children}</div>
  </div>;
}
