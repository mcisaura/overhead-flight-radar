"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "./theme-provider";
import SlidingChoiceGroup from "./sliding-choice-group";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeMode();
  return <SlidingChoiceGroup className="theme-toggle" label="Appearance" motionKey="theme" selectedIndex={theme === "light" ? 0 : 1}>
    <button type="button" aria-label="Light mode" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun size={14} aria-hidden="true" /><span>Light</span></button>
    <button type="button" aria-label="Dark mode" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon size={14} aria-hidden="true" /><span>Dark</span></button>
  </SlidingChoiceGroup>;
}
