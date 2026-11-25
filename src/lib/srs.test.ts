import { describe, expect, it } from "vitest"
import { lessons } from "../data/lessons.ts"
import { vocabulary } from "../data/vocabulary.ts"
import { addDays, applyReview, DEFAULT_EASE, MIN_EASE, newSchedule, summarizeDue } from "./srs.ts"

const today = "2026-11-25"

describe("starter vocabulary", () => {
  it("ties every card to an existing topic, with a word, Chinese, IPA, and example", () => {
    const topics = new Set(lessons.map((lesson) => lesson.id))
    const ids = new Set<string>()
    expect(vocabulary.length).toBeGreaterThanOrEqual(16)
    for (const card of vocabulary) {
      expect(topics.has(card.topicId)).toBe(true)
      expect(ids.has(card.id)).toBe(false)
      ids.add(card.id)
      expect(card.id.startsWith(`${card.topicId}:`)).toBe(true)
      expect(card.word).toMatch(/^[a-z]+$/)
      expect(card.zh.trim().length).toBeGreaterThan(0)
      expect(card.ipa.startsWith("/")).toBe(true)
      expect(card.ipa.endsWith("/")).toBe(true)
      const tokens = card.example.toLowerCase().match(/[a-z']+/g) ?? []
      expect(tokens).toContain(card.word)
    }
  })
})

describe("SM-2 schedule", () => {
  it("introduces a new card as due today", () => {
    const card = newSchedule(today)
    expect(card).toEqual({ ease: DEFAULT_EASE, interval: 0, repetitions: 0, due: today, lastReview: null })
    const summary = summarizeDue({}, ["greetings:hello"], today)
    expect(summary).toEqual({ due: 1, fresh: 1 })
  })

  it("does not mutate the previous schedule", () => {
    const card = newSchedule(today)
    const copy = { ...card }
    applyReview(card, "good", today)
    expect(card).toEqual(copy)
  })

  it("grows intervals 1 day, then 6 days, then interval times ease", () => {
    let card = newSchedule(today)
    card = applyReview(card, "good", today)
    expect(card).toMatchObject({ ease: 2.6, interval: 1, repetitions: 1, due: "2026-11-26", lastReview: today })

    card = applyReview(card, "good", "2026-11-26")
    expect(card).toMatchObject({ ease: 2.7, interval: 6, repetitions: 2, due: "2026-12-02" })

    card = applyReview(card, "good", "2026-12-02")
    expect(card).toMatchObject({ ease: 2.8, interval: 17, repetitions: 3, due: "2026-12-19" })
  })

  it("resets a forgotten card to tomorrow and lowers ease", () => {
    let card = applyReview(newSchedule(today), "good", today)
    card = applyReview(card, "good", "2026-11-26")
    card = applyReview(card, "again", "2026-12-02")
    expect(card).toMatchObject({ ease: 2.16, interval: 1, repetitions: 0, due: "2026-12-03", lastReview: "2026-12-02" })
    expect(card.due > "2026-12-02").toBe(true)
  })

  it("treats 模糊 as the lowest passing grade", () => {
    const card = applyReview(newSchedule(today), "hard", today)
    expect(card).toMatchObject({ ease: 2.36, interval: 1, repetitions: 1, due: "2026-11-26" })
  })

  it("never drops ease below 1.3", () => {
    let card = newSchedule(today)
    card = applyReview(card, "again", today)
    card = applyReview(card, "again", "2026-11-26")
    card = applyReview(card, "again", "2026-11-27")
    expect(card.ease).toBe(MIN_EASE)
  })

  it("counts only cards due today, and tells new cards from reviews", () => {
    const fresh = newSchedule(today)
    const remembered = applyReview(fresh, "good", today)
    const forgotten = applyReview(remembered, "again", "2026-11-26")
    const schedules = {
      "greetings:hello": remembered,
      "greetings:morning": forgotten,
    }
    expect(summarizeDue(schedules, ["greetings:hello", "greetings:morning", "food:tea"], "2026-11-26")).toEqual({
      due: 2,
      fresh: 1,
    })
    expect(summarizeDue(schedules, ["greetings:hello"], today).due).toBe(0)
  })

  it("steps across month ends", () => {
    expect(addDays("2026-01-31", 6)).toBe("2026-02-06")
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01")
  })
})
