export type ThemePreference = "system" | "light" | "dark"

export type ResolvedTheme = "light" | "dark"

export const THEME_KEY = "tingshuo.theme.v1"

export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f4efe6",
  dark: "#1b2330",
}

export function parseTheme(raw: string | null | undefined): ThemePreference {
  if (raw === "light" || raw === "dark" || raw === "system") return raw
  if (typeof raw === "string" && raw.startsWith('"')) {
    try {
      return parseTheme(JSON.parse(raw) as string)
    } catch {
      return "system"
    }
  }
  return "system"
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference
  return systemDark ? "dark" : "light"
}

export function loadTheme(): ThemePreference {
  try {
    if (typeof localStorage === "undefined") return "system"
    return parseTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return "system"
  }
}

export function saveTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference)
  } catch {
    // The toggle still applies for this visit.
  }
}
