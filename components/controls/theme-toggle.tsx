"use client";

import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "./theme-provider";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeMode();
  const dark = theme === "dark";
  const nextTheme = dark ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
    >
      {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
