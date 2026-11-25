import { describe, expect, it } from "vitest"
import { lessons } from "../data/lessons.ts"
import { buildChoices } from "./choices.ts"

describe("buildChoices", () => {
  it("always includes the answer, stays stable, and has no duplicates", () => {
    const lesson = lessons[0]!
    const correct = lesson.items[0]!.en
    const pool = lesson.items.map((item) => item.en)
    const first = buildChoices(correct, pool, "greetings:g01")
    const second = buildChoices(correct, pool, "greetings:g01")
    expect(first).toEqual(second)
    expect(first).toHaveLength(4)
    expect(new Set(first).size).toBe(4)
    expect(first).toContain(correct)
  })
})

describe("lessons", () => {
  it("ships every topic with 15 items each", () => {
    expect(lessons).toHaveLength(10)
    expect(lessons.map((lesson) => lesson.id)).toContain("shopping")
    for (const lesson of lessons) {
      expect(lesson.items).toHaveLength(15)
      expect(new Set(lesson.items.map((item) => item.id)).size).toBe(15)
      for (const item of lesson.items) {
        expect(item.en.trim().length).toBeGreaterThan(0)
        expect(item.zh.trim().length).toBeGreaterThan(0)
        expect(item.ipa.startsWith("/")).toBe(true)
      }
    }
  })
})
