import { describe, expect, it } from "vitest"
import {
  buildSystemPrompt,
  buildTutorMessages,
  HISTORY_LIMIT,
  parseTutorReply,
  scenarioById,
} from "./ai-prompt.ts"

const secret = "sk-test-only-not-real"

describe("tutor messages", () => {
  it("keeps the scenario, level, and hint preference in the system prompt", () => {
    const food = scenarioById("food")
    const beginner = buildSystemPrompt(food, "beginner", true)
    expect(beginner).toContain("點餐")
    expect(beginner).toContain(food.situation)
    expect(beginner).toContain("1 or 2 sentences")
    expect(beginner).toContain("Traditional Chinese")
    expect(beginner).toContain("correctionZh")

    const advanced = buildSystemPrompt(scenarioById("work"), "advanced", false)
    expect(advanced).toContain("at most 4 sentences")
    expect(advanced).toContain("Set hint to null")
    expect(advanced).not.toContain("Set hint to one short")
  })

  it("puts the learner's words only in user messages and keeps the latest turn", () => {
    const history = Array.from({ length: 21 }, (_, index) => ({
      role: (index % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      text: index === 20 ? `I want coffee ${secret}` : `   turn ${index}   `,
    }))
    history.push({ role: "user", text: "   " })
    const messages = buildTutorMessages({
      scenario: scenarioById("food"),
      level: "intermediate",
      showHint: true,
      history,
    })

    expect(messages[0]?.role).toBe("system")
    expect(messages[0]?.content).not.toContain(secret)
    expect(messages[0]?.content).not.toContain("I want coffee")
    expect(messages).toHaveLength(HISTORY_LIMIT + 1)
    expect(messages.at(-1)).toEqual({ role: "user", content: `I want coffee ${secret}` })
    expect(messages.filter((item) => item.role === "user").every((item) => !item.content.startsWith(" "))).toBe(true)
    expect(messages.some((item) => item.content === "turn 7")).toBe(false)
  })

  it("parses a fenced JSON reply and ignores null corrections", () => {
    const reply = parseTutorReply(
      '```json\n{"english":"Would you like tea?","correction":"null","correctionZh":"none","hint":"你想喝茶嗎？"}\n```',
    )
    expect(reply).toEqual({
      english: "Would you like tea?",
      correction: null,
      correctionZh: null,
      hint: "你想喝茶嗎？",
    })
  })

  it("reads JSON wrapped in extra text, and falls back to plain English", () => {
    expect(
      parseTutorReply('Sure {"english":"A ticket to Taipei, please.","correction":"A ticket to Taipei, please.","correction_zh":"請給我一張到台北的票。","hint":null} thanks'),
    ).toEqual({
      english: "A ticket to Taipei, please.",
      correction: "A ticket to Taipei, please.",
      correctionZh: "請給我一張到台北的票。",
      hint: null,
    })

    expect(parseTutorReply("Hello! How are you?")).toEqual({
      english: "Hello! How are you?",
      correction: null,
      correctionZh: null,
      hint: null,
    })
  })
})
