"use client"

import * as React from "react"

export type ThemePref = "light" | "dark" | "system"
type Resolved = "light" | "dark"

const STORAGE_KEY = "nw_theme"

interface ThemeContextValue {
  theme: ThemePref
  resolved: Resolved
  setTheme: (t: ThemePref) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function systemPref(): Resolved {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyClass(resolved: Resolved) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

const THEME_EVENT = "nw-theme"

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  window.addEventListener(THEME_EVENT, onChange)
  window.addEventListener("storage", onChange)
  mq.addEventListener("change", onChange)
  return () => {
    window.removeEventListener(THEME_EVENT, onChange)
    window.removeEventListener("storage", onChange)
    mq.removeEventListener("change", onChange)
  }
}

function storedPref(): ThemePref {
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === "light" || v === "dark" ? v : "system"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribe, storedPref, () => "system" as ThemePref)
  const resolved = React.useSyncExternalStore(
    subscribe,
    () => (storedPref() === "system" ? systemPref() : (storedPref() as Resolved)),
    () => "light" as Resolved
  )

  React.useEffect(() => applyClass(resolved), [resolved])

  const setTheme = React.useCallback((t: ThemePref) => {
    window.localStorage.setItem(STORAGE_KEY, t)
    window.dispatchEvent(new Event(THEME_EVENT))
  }, [])

  const value = React.useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    // Fallback inerte para uso fuera del provider
    return {
      theme: "system",
      resolved: "light",
      setTheme: () => {},
    }
  }
  return ctx
}
