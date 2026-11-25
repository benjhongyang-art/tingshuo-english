import { describe, expect, it, vi } from "vitest"
import { defaultAiSettings } from "./ai-settings.ts"
import { buildTutorMessages, scenarioById } from "./ai-prompt.ts"
import {
  aiErrorFromStatus,
  canonicalBaseUrl,
  chatCompletionsUrl,
  readAssistantText,
  redactSecret,
  requestTutorReply,
} from "./ai-client.ts"

const secret = "sk-test-only-not-real"

function settings(patch: Partial<ReturnType<typeof defaultAiSettings>> = {}) {
  return { ...defaultAiSettings(), apiKey: secret, ...patch }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

describe("chat endpoint", () => {
  it("builds an OpenAI-compatible completions URL and strips embedded secrets", () => {
    expect(chatCompletionsUrl("https://api.openai.com/v1")).toBe("https://api.openai.com/v1/chat/completions")
    expect(chatCompletionsUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1/chat/completions")
    expect(chatCompletionsUrl("https://api.openai.com/v1/chat/completions")).toBe(
      "https://api.openai.com/v1/chat/completions",
    )
    expect(canonicalBaseUrl(`https://user:${secret}@example.com/v1/`)).toBe("https://example.com/v1")
    expect(chatCompletionsUrl("http://localhost:11434/v1")).toBe("http://localhost:11434/v1/chat/completions")
    expect(chatCompletionsUrl("javascript:alert(1)")).toBeNull()
    expect(chatCompletionsUrl("")).toBeNull()
  })

  it("sends the key only in the Authorization header", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get("Authorization")).toBe(`Bearer ${secret}`)
      const body = String(init?.body)
      expect(body).not.toContain(secret)
      expect(JSON.parse(body)).toMatchObject({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
      })
      return jsonResponse(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                english: "Would you like coffee or tea?",
                correction: "I'd like a coffee, please.",
                correctionZh: "請給我一杯咖啡。",
                hint: "你想要咖啡還是茶？",
              }),
            },
          },
        ],
      })
    })

    const messages = buildTutorMessages({
      scenario: scenarioById("food"),
      level: "beginner",
      showHint: true,
      history: [
        { role: "assistant", text: "Hi! What would you like to order?" },
        { role: "user", text: "I want coffee" },
      ],
    })
    const result = await requestTutorReply({ settings: settings(), messages, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(result).toEqual({
      ok: true,
      reply: {
        english: "Would you like coffee or tea?",
        correction: "I'd like a coffee, please.",
        correctionZh: "請給我一杯咖啡。",
        hint: "你想要咖啡還是茶？",
      },
    })
  })

  it("omits JSON mode for a compatible provider and reads array content", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body)).response_format).toBeUndefined()
      return jsonResponse(200, {
        choices: [{ message: { content: [{ type: "text", text: '{"english":"Have a nice day."}' }] } }],
      })
    })
    const result = await requestTutorReply({
      settings: settings({ provider: "compatible", baseUrl: "http://localhost:11434/v1", model: "local" }),
      messages: [{ role: "user", content: "Hi" }],
      fetchImpl,
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.reply.english).toBe("Have a nice day.")
  })

  it("does not call the network without a key, and hides the key from errors", async () => {
    const fetchImpl = vi.fn()
    const missing = await requestTutorReply({
      settings: settings({ apiKey: "  " }),
      messages: [],
      fetchImpl,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(missing.ok).toBe(false)
    if (!missing.ok) {
      expect(missing.code).toBe("missing-key")
      expect(missing.message).toContain("這台瀏覽器")
    }

    const invalid = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => jsonResponse(401, { error: { message: `bad ${secret}` } }),
    })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) {
      expect(invalid.code).toBe("invalid-key")
      expect(invalid.message).not.toContain(secret)
    }

    expect(aiErrorFromStatus(429).code).toBe("rate-limit")
    const limited = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => jsonResponse(429, { error: secret }),
    })
    expect(limited.ok).toBe(false)
    if (!limited.ok) {
      expect(limited.code).toBe("rate-limit")
      expect(JSON.stringify(limited)).not.toContain(secret)
    }

    const network = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => {
        throw new Error(`network down ${secret}`)
      },
    })
    expect(network.ok).toBe(false)
    if (!network.ok) {
      expect(network.code).toBe("network")
      expect(network.message).not.toContain(secret)
      expect(network.message).toContain("離線")
    }

    vi.stubGlobal("navigator", { onLine: false })
    const offlineFetch = vi.fn()
    const offline = await requestTutorReply({ settings: settings(), messages: [], fetchImpl: offlineFetch })
    expect(offlineFetch).not.toHaveBeenCalled()
    expect(offline).toMatchObject({ ok: false, code: "offline" })
    if (!offline.ok) expect(offline.message).toContain("目前沒有網路")
    vi.unstubAllGlobals()

    const leaked = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () =>
        jsonResponse(200, { choices: [{ message: { content: `{"english":"Your key is ${secret}"}` } }] }),
    })
    expect(leaked.ok).toBe(true)
    if (leaked.ok) expect(leaked.reply.english).not.toContain(secret)
    expect(redactSecret(`echo ${secret}`, secret)).toBe("echo ［已隱藏］")
  })

  it("maps billing, server, and empty replies, and stays quiet when aborted", async () => {
    const billing = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => jsonResponse(402, {}),
    })
    expect(billing.ok).toBe(false)
    if (!billing.ok) expect(billing.code).toBe("billing")

    const down = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => jsonResponse(503, { error: secret }),
    })
    expect(down.ok).toBe(false)
    if (!down.ok) {
      expect(down.message).toContain("稍後再試")
      expect(down.message).not.toContain(secret)
    }

    const empty = await requestTutorReply({
      settings: settings(),
      messages: [],
      fetchImpl: async () => jsonResponse(200, { choices: [{ message: { content: "" } }] }),
    })
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.code).toBe("bad-response")
    expect(readAssistantText({ choices: [] })).toBeNull()

    const signal = AbortSignal.abort()
    const aborted = await requestTutorReply({
      settings: settings({ baseUrl: "not a url" }),
      messages: [],
      signal,
      fetchImpl: async () => {
        throw new Error("aborted")
      },
    })
    expect(aborted.ok).toBe(false)
    if (!aborted.ok) expect(aborted.code).toBe("bad-url")

    const stopped = await requestTutorReply({
      settings: settings(),
      messages: [],
      signal,
      fetchImpl: async () => {
        throw new Error(`aborted ${secret}`)
      },
    })
    expect(stopped.ok).toBe(false)
    if (!stopped.ok) {
      expect(stopped.code).toBe("aborted")
      expect(stopped.message).not.toContain(secret)
    }
  })
})
