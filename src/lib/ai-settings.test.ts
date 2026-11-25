import { afterEach, describe, expect, it, vi } from "vitest"
import {
  AI_SETTINGS_KEY,
  defaultAiSettings,
  loadAiSettings,
  maskApiKey,
  normalizeAiDraft,
  parseAiSettings,
  saveAiSettings,
  withoutApiKey,
} from "./ai-settings.ts"

const secret = "sk-test-only-not-real"

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
  vi.restoreAllMocks()
})

describe("api key storage", () => {
  it("stores the key only under the AI settings entry and does not log it", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", JSON.stringify({ streak: 2, lastPracticeDate: "2026-11-25", items: {} }))
    mem.set("tingshuo.mistakes.v1", JSON.stringify({ version: 1, items: [] }))
    const spies = ["log", "info", "warn", "error", "debug"].map((method) =>
      vi.spyOn(console, method as "log").mockImplementation(() => {}),
    )

    saveAiSettings({
      ...defaultAiSettings(),
      provider: "compatible",
      baseUrl: "http://localhost:11434/v1",
      model: "llama3",
      apiKey: `  ${secret}  `,
      level: "advanced",
      scenarioId: "travel",
      showHint: false,
    })

    const saved = loadAiSettings()
    expect(saved.apiKey).toBe(secret)
    expect(saved.provider).toBe("compatible")
    expect(saved.level).toBe("advanced")
    expect(saved.showHint).toBe(false)
    expect(mem.get("tingshuo.progress.v1")).not.toContain(secret)
    expect(mem.get("tingshuo.mistakes.v1")).not.toContain(secret)
    expect(mem.get(AI_SETTINGS_KEY)).toContain(secret)
    expect([...mem.keys()].filter((key) => mem.get(key)?.includes(secret))).toEqual([AI_SETTINGS_KEY])
    const logged = spies.flatMap((spy) => spy.mock.calls.flat().map(String)).join("\n")
    expect(logged).not.toContain(secret)
    expect(maskApiKey(secret)).toBe("末四碼 real")
    expect(maskApiKey(secret)).not.toBe(secret)
  })

  it("drops a corrupt payload and keeps a usable key from a partial one", () => {
    const mem = installStorage()
    mem.set(AI_SETTINGS_KEY, "{")
    expect(loadAiSettings()).toEqual(defaultAiSettings())

    expect(
      parseAiSettings({
        apiKey: secret,
        provider: "nope",
        model: 12,
        baseUrl: "https://example.com/v1",
        scenarioId: "missing",
      }),
    ).toMatchObject({
      apiKey: secret,
      provider: "openai",
      model: defaultAiSettings().model,
      baseUrl: "https://example.com/v1",
      scenarioId: "food",
      level: "beginner",
    })
  })

  it("rejects a bad URL without writing, and clears only the key", () => {
    const mem = installStorage()
    const prefs = { level: "beginner" as const, scenarioId: "food", showHint: true, autoSpeak: true }
    const rejected = normalizeAiDraft(
      { provider: "openai", baseUrl: "javascript:alert(1)", model: "gpt-4o-mini", apiKey: secret },
      prefs,
    )
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.message).not.toContain(secret)

    const accepted = normalizeAiDraft(
      { provider: "openai", baseUrl: `https://user:${secret}@api.openai.com/v1/chat/completions/`, model: "gpt-4o-mini", apiKey: secret },
      prefs,
    )
    expect(accepted.ok).toBe(true)
    if (accepted.ok) {
      expect(accepted.settings.baseUrl).toBe("https://api.openai.com/v1")
      expect(accepted.settings.baseUrl).not.toContain(secret)
      saveAiSettings(accepted.settings)
      saveAiSettings(withoutApiKey(loadAiSettings()))
      expect(loadAiSettings().apiKey).toBe("")
      expect(loadAiSettings().model).toBe("gpt-4o-mini")
      expect(mem.get("tingshuo.progress.v1")).toBeUndefined()
    }
  })

  it("survives storage that throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error(secret)
      },
      setItem: () => {
        throw new Error(secret)
      },
    })
    expect(() => saveAiSettings({ ...defaultAiSettings(), apiKey: secret })).not.toThrow()
    expect(loadAiSettings().apiKey).toBe("")
  })
})
