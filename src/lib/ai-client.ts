import type { AiSettings } from "./ai-settings.ts"
import { parseTutorReply, type ChatMessage, type TutorReply } from "./ai-prompt.ts"

export const OPENAI_BASE_URL = "https://api.openai.com/v1"
export const OPENAI_MODEL = "gpt-4o-mini"

export type AiErrorCode =
  | "missing-key"
  | "invalid-key"
  | "rate-limit"
  | "network"
  | "bad-url"
  | "bad-response"
  | "provider"
  | "billing"
  | "offline"
  | "aborted"

export type AiResult =
  | { ok: true; reply: TutorReply }
  | { ok: false; code: AiErrorCode; message: string }

export function canonicalBaseUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    url.username = ""
    url.password = ""
    url.hash = ""
    const path = url.pathname.replace(/\/+$/, "").replace(/\/chat\/completions$/, "")
    url.pathname = path || "/"
    return url.toString().replace(/\/$/, "")
  } catch {
    return null
  }
}

export function chatCompletionsUrl(input: string): string | null {
  const base = canonicalBaseUrl(input)
  if (!base) return null
  return `${base}/chat/completions`
}

export function describeAiError(code: Exclude<AiErrorCode, "aborted">, status?: number): string {
  switch (code) {
    case "missing-key":
      return "尚未設定 API 金鑰。請到設定貼上你自己的金鑰。金鑰只存在這台瀏覽器。"
    case "invalid-key":
      return "金鑰無效，或這個帳戶沒有權限。請到設定檢查後再試。"
    case "rate-limit":
      return "請求太頻繁，請稍等一下再送出。費用是向你自己的 API 帳戶計費。"
    case "network":
      return "連不上 API。請檢查網路。沒有網路時無法進行英文對話；聽力、發音、單字、文法、閱讀和錯題本可以離線使用。"
    case "offline":
      return "目前沒有網路，無法進行英文對話。請連上網路後再試。聽力、發音、單字、文法、閱讀和錯題本都可以離線使用。"
    case "bad-url":
      return "API 網址不正確。請填 http 或 https 開頭的網址。"
    case "billing":
      return "這個 API 帳戶無法完成請求。請到你的帳戶確認額度或付款方式。"
    case "bad-response":
      return "伺服器沒有回傳可用的英文回覆。請再試一次，或到設定換一個模型。"
    case "provider":
      return status
        ? `伺服器拒絕了這次請求（HTTP ${status}）。請到設定確認模型名稱與網址。`
        : "伺服器拒絕了這次請求。請到設定確認模型名稱與網址。"
  }
}

export function aiErrorFromStatus(status: number): { code: AiErrorCode; message: string } {
  if (status === 401 || status === 403) return { code: "invalid-key", message: describeAiError("invalid-key") }
  if (status === 402) return { code: "billing", message: describeAiError("billing") }
  if (status === 429) return { code: "rate-limit", message: describeAiError("rate-limit") }
  if (status >= 500) return { code: "provider", message: "API 伺服器暫時沒有回應，請稍後再試。" }
  return { code: "provider", message: describeAiError("provider", status) }
}

/** Removes a stored key from text. Short strings are left alone so ordinary English is not eaten. */
export function redactSecret(text: string, secret: string): string {
  const trimmed = secret.trim()
  if (trimmed.length < 8 || !text.includes(trimmed)) return text
  return text.split(trimmed).join("［已隱藏］")
}

export function buildChatBody(model: string, messages: ChatMessage[], jsonMode: boolean) {
  return {
    model,
    messages,
    temperature: 0.7,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  }
}

export function readAssistantText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const message = (choices[0] as { message?: { content?: unknown } } | undefined)?.message
  return contentToText(message?.content)
}

function contentToText(content: unknown): string | null {
  if (typeof content === "string") return content.trim() ? content : null
  if (!Array.isArray(content)) return null
  const text = content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text
      }
      return ""
    })
    .join("")
  return text.trim() ? text : null
}

export async function requestTutorReply(options: {
  settings: Pick<AiSettings, "apiKey" | "baseUrl" | "model" | "provider">
  messages: ChatMessage[]
  fetchImpl?: typeof fetch
  signal?: AbortSignal
}): Promise<AiResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ok: false, code: "offline", message: describeAiError("offline") }
  }
  const apiKey = options.settings.apiKey.trim()
  if (!apiKey) return { ok: false, code: "missing-key", message: describeAiError("missing-key") }
  const url = chatCompletionsUrl(options.settings.baseUrl)
  if (!url) return { ok: false, code: "bad-url", message: describeAiError("bad-url") }
  const model = options.settings.model.trim()
  if (!model) return { ok: false, code: "provider", message: "請到設定填寫模型名稱。" }

  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildChatBody(model, options.messages, options.settings.provider === "openai")),
      signal: options.signal,
    })
  } catch {
    if (options.signal?.aborted) return { ok: false, code: "aborted", message: "" }
    return { ok: false, code: "network", message: describeAiError("network") }
  }

  if (options.signal?.aborted) return { ok: false, code: "aborted", message: "" }

  if (!response.ok) {
    await response.text().catch(() => "")
    return { ok: false, ...aiErrorFromStatus(response.status) }
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, code: "bad-response", message: describeAiError("bad-response") }
  }

  const text = readAssistantText(payload)
  if (!text) return { ok: false, code: "bad-response", message: describeAiError("bad-response") }
  const reply = scrubReply(parseTutorReply(text), apiKey)
  if (!reply.english.trim()) return { ok: false, code: "bad-response", message: describeAiError("bad-response") }
  return { ok: true, reply }
}

function scrubReply(reply: TutorReply, apiKey: string): TutorReply {
  return {
    english: redactSecret(reply.english, apiKey),
    correction: reply.correction ? redactSecret(reply.correction, apiKey) : null,
    correctionZh: reply.correctionZh ? redactSecret(reply.correctionZh, apiKey) : null,
    hint: reply.hint ? redactSecret(reply.hint, apiKey) : null,
  }
}
