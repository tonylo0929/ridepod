"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const themeChangeEvent = "ridepod-theme-change";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("ridepod-theme");
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function getThemeSnapshot(): Theme {
  return getPreferredTheme();
}

function getServerThemeSnapshot(): Theme {
  return "dark";
}

function subscribeToTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(themeChangeEvent, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(themeChangeEvent, listener);
  };
}

function commitTheme(theme: Theme) {
  applyTheme(theme);
  window.localStorage.setItem("ridepod-theme", theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: commitTheme,
      toggleTheme: () => commitTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
