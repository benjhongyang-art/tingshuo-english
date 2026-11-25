import { afterEach, describe, expect, it, vi } from "vitest"
import { THEME_KEY, loadTheme, parseTheme, resolveTheme, saveTheme } from "./theme.ts"

function installStorage(): Map<string, string> {
  const mem = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value)
    },
    removeItem: (key: string) => {
      mem.delete(key)
    },
  })
  return mem
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("theme preference", () => {
  it("resolves system, light, and dark", () => {
    expect(resolveTheme("system", false)).toBe("light")
    expect(resolveTheme("system", true)).toBe("dark")
    expect(resolveTheme("light", true)).toBe("light")
    expect(resolveTheme("dark", false)).toBe("dark")
    expect(parseTheme(null)).toBe("system")
    expect(parseTheme("nope")).toBe("system")
    expect(parseTheme("\"dark\"")).toBe("dark")
  })

  it("persists the choice and leaves the other records alone", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", "{\"streak\":1}")
    mem.set("tingshuo.vocab.v1", "{\"version\":1}")
    mem.set("tingshuo.mistakes.v1", "{\"items\":[]}")
    mem.set("tingshuo.grammar.v1", "{\"topics\":{}}")
    mem.set("tingshuo.ai.v1", "{\"apiKey\":\"stay\"}")
    expect(loadTheme()).toBe("system")
    saveTheme("dark")
    expect(loadTheme()).toBe("dark")
    expect(mem.get(THEME_KEY)).toBe("dark")
    expect(mem.get("tingshuo.progress.v1")).toBe("{\"streak\":1}")
    expect(mem.get("tingshuo.vocab.v1")).toBe("{\"version\":1}")
    expect(mem.get("tingshuo.mistakes.v1")).toBe("{\"items\":[]}")
    expect(mem.get("tingshuo.grammar.v1")).toBe("{\"topics\":{}}")
    expect(mem.get("tingshuo.ai.v1")).toBe("{\"apiKey\":\"stay\"}")
    mem.set(THEME_KEY, "sideways")
    expect(loadTheme()).toBe("system")
  })
})
