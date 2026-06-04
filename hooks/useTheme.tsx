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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemePref>("system")
  const [resolved, setResolved] = React.useState<Resolved>("light")

  // Hidratar desde localStorage al montar
  React.useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null) as ThemePref | null
    const initial: ThemePref =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system"
    setThemeState(initial)
    const r = initial === "system" ? systemPref() : initial
    setResolved(r)
    applyClass(r)
  }, [])

  // Si el usuario eligió "system", reaccionar a cambios del SO
  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const r: Resolved = mq.matches ? "dark" : "light"
      setResolved(r)
      applyClass(r)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = React.useCallback((t: ThemePref) => {
    setThemeState(t)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, t)
    }
    const r = t === "system" ? systemPref() : t
    setResolved(r)
    applyClass(r)
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
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
