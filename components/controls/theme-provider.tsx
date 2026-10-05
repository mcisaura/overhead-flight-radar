"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function changeTheme(next: Theme) {
    if (next === theme) return;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("theme-transition");
      transitionTimer.current = setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
        transitionTimer.current = null;
      }, 500);
    } else document.documentElement.classList.remove("theme-transition");
    setTheme(next);
  }

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    document.documentElement.classList.remove("theme-transition");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemeMode must be used inside ThemeProvider");
  return context;
}
