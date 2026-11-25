import { afterEach, describe, expect, it, vi } from "vitest"
import { getReading, readings } from "../data/readings.ts"
import { loadReadingStats, saveReadingStats } from "./reading-store.ts"
import {
  emptyReadingStats,
  gradeReading,
  lookupGloss,
  parseReadingStats,
  passageAccuracy,
  readingMistakeTarget,
  recordReadingAttempt,
  summarizeReading,
  tokenizeSentence,
} from "./reading.ts"

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

describe("reading score", () => {
  it("marks only the matching choice correct", () => {
    expect(gradeReading("b", "b")).toBe(true)
    expect(gradeReading("b", "a")).toBe(false)
    expect(gradeReading("b", "")).toBe(false)
  })

  it("tracks passage accuracy and builds a mistake entry", () => {
    const passage = readings[0]!
    const question = passage.questions[0]!
    let stats = recordReadingAttempt(emptyReadingStats(), passage.id, false)
    stats = recordReadingAttempt(stats, passage.id, true)
    expect(passageAccuracy(stats, passage.id)).toBe(50)
    expect(summarizeReading(stats)).toEqual({ attempts: 2, correct: 1, accuracy: 50 })
    expect(passageAccuracy(stats, "missing")).toBeNull()
    const target = readingMistakeTarget(passage, question, "星期日晚上")
    expect(target).toMatchObject({
      kind: "phrase",
      topicId: passage.id,
      refId: question.id,
      en: question.focusEn,
      zh: question.focusZh,
    })
    expect(target.note).toContain("星期日晚上")
    expect(target.note).toContain(question.explanation)
  })

  it("splits a sentence into tappable words", () => {
    const tokens = tokenizeSentence("Mei goes to the market.")
    expect(tokens.map((token) => token.lookup).filter(Boolean)).toEqual(["mei", "goes", "to", "the", "market"])
    expect(tokens.at(-1)?.text).toBe(".")
    expect(lookupGloss({ market: "市場", "o'clock": "點鐘" }, "Market")).toBe("市場")
    expect(lookupGloss({ "o'clock": "點鐘" }, "o’clock")).toBe("點鐘")
    expect(lookupGloss({ market: "市場" }, "bread")).toBeNull()
  })

  it("stores reading accuracy without rewriting older keys", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", "{\"streak\":3}")
    mem.set("tingshuo.vocab.v1", "{\"version\":1}")
    mem.set("tingshuo.mistakes.v1", "{\"items\":[]}")
    mem.set("tingshuo.grammar.v1", "{\"topics\":{}}")
    mem.set("tingshuo.ai.v1", "{\"apiKey\":\"stay\"}")
    saveReadingStats(recordReadingAttempt(emptyReadingStats(), "reading-market", false))
    expect(loadReadingStats().passages["reading-market"]).toEqual({ attempts: 1, correct: 0 })
    expect(mem.get("tingshuo.progress.v1")).toBe("{\"streak\":3}")
    expect(mem.get("tingshuo.ai.v1")).toBe("{\"apiKey\":\"stay\"}")
    expect(mem.get("tingshuo.grammar.v1")).toBe("{\"topics\":{}}")
    expect(parseReadingStats({ passages: { bad: { attempts: 0, correct: 1 }, ok: { attempts: 2, correct: 5 } } })).toEqual({
      passages: { ok: { attempts: 2, correct: 2 } },
    })
    expect(getReading("reading-market")?.level).toBe("beginner")
  })
})
