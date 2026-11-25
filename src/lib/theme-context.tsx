import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { loadTheme, resolveTheme, saveTheme, THEME_COLORS, type ResolvedTheme, type ThemePreference } from "./theme.ts"

type ThemeApi = {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeApi | null>(null)

function systemIsDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function paint(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", THEME_COLORS[resolved])
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => loadTheme())
  const [systemDark, setSystemDark] = useState(() => systemIsDark())

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  const resolved = resolveTheme(preference, systemDark)

  useEffect(() => {
    paint(resolved)
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    saveTheme(next)
    setPreferenceState(next)
  }, [])

  const api = useMemo<ThemeApi>(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])

  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext)
  if (!api) throw new Error("useTheme 必須放在 ThemeProvider 裡")
  return api
}
