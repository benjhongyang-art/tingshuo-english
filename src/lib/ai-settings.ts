import { canonicalBaseUrl, OPENAI_BASE_URL, OPENAI_MODEL } from "./ai-client.ts"
import { isAiLevel, scenarios, type AiLevel } from "./ai-prompt.ts"

/** API key lives only in this localStorage entry. Do not log the value. */
export const AI_SETTINGS_KEY = "tingshuo.ai.v1"

export type AiProvider = "openai" | "compatible"

export type AiSettings = {
  provider: AiProvider
  baseUrl: string
  model: string
  apiKey: string
  level: AiLevel
  scenarioId: string
  showHint: boolean
  autoSpeak: boolean
}

export type AiDraft = {
  provider: AiProvider
  baseUrl: string
  model: string
  apiKey: string
}

export function defaultAiSettings(): AiSettings {
  return {
    provider: "openai",
    baseUrl: OPENAI_BASE_URL,
    model: OPENAI_MODEL,
    apiKey: "",
    level: "beginner",
    scenarioId: "food",
    showHint: true,
    autoSpeak: true,
  }
}

export function hasApiKey(settings: Pick<AiSettings, "apiKey">): boolean {
  return settings.apiKey.trim().length > 0
}

/** Last four characters only, so the screen can confirm which key is saved. */
export function maskApiKey(apiKey: string): string | null {
  const trimmed = apiKey.trim()
  if (!trimmed) return null
  if (trimmed.length < 8) return "已儲存"
  return `末四碼 ${trimmed.slice(-4)}`
}

export function withoutApiKey(settings: AiSettings): AiSettings {
  return { ...settings, apiKey: "" }
}

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "openai" || value === "compatible"
}

export function parseAiSettings(raw: unknown): AiSettings {
  const defaults = defaultAiSettings()
  if (!raw || typeof raw !== "object") return defaults
  const value = raw as Partial<AiSettings>
  const scenarioId =
    typeof value.scenarioId === "string" && scenarios.some((item) => item.id === value.scenarioId)
      ? value.scenarioId
      : defaults.scenarioId
  const baseUrl = typeof value.baseUrl === "string" ? value.baseUrl.trim() : ""
  const model = typeof value.model === "string" ? value.model.trim() : ""
  return {
    provider: isAiProvider(value.provider) ? value.provider : defaults.provider,
    baseUrl: baseUrl || defaults.baseUrl,
    model: model || defaults.model,
    apiKey: typeof value.apiKey === "string" ? value.apiKey.trim() : "",
    level: isAiLevel(value.level) ? value.level : defaults.level,
    scenarioId,
    showHint: typeof value.showHint === "boolean" ? value.showHint : defaults.showHint,
    autoSpeak: typeof value.autoSpeak === "boolean" ? value.autoSpeak : defaults.autoSpeak,
  }
}

export function normalizeAiDraft(
  draft: AiDraft,
  prefs: Pick<AiSettings, "level" | "scenarioId" | "showHint" | "autoSpeak">,
): { ok: true; settings: AiSettings } | { ok: false; message: string } {
  const baseUrl = canonicalBaseUrl(draft.baseUrl)
  if (!baseUrl) return { ok: false, message: "API 網址需要以 http:// 或 https:// 開頭。" }
  const model = draft.model.trim()
  if (!model) return { ok: false, message: "請填寫模型名稱。" }
  return {
    ok: true,
    settings: parseAiSettings({
      provider: isAiProvider(draft.provider) ? draft.provider : "openai",
      baseUrl,
      model,
      apiKey: draft.apiKey.trim(),
      ...prefs,
    }),
  }
}

function readRaw(): string | null {
  try {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(AI_SETTINGS_KEY)
  } catch {
    return null
  }
}

function writeRaw(value: string): void {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, value)
  } catch {
    // Private mode and full storage should not block the rest of the app.
  }
}

export function loadAiSettings(): AiSettings {
  const raw = readRaw()
  if (!raw) return defaultAiSettings()
  try {
    return parseAiSettings(JSON.parse(raw))
  } catch {
    return defaultAiSettings()
  }
}

export function saveAiSettings(settings: AiSettings): void {
  const parsed = parseAiSettings(settings)
  writeRaw(JSON.stringify({ version: 1, ...parsed }))
}
