import { describe, expect, it } from "vitest"
import { lessons } from "./lessons.ts"
import { levelOrder, readings } from "./readings.ts"
import { vocabulary } from "./vocabulary.ts"

describe("lesson and reading catalog", () => {
  it("gives every topic fifteen sentences and matching vocabulary", () => {
    expect(lessons.map((lesson) => lesson.id)).toEqual([
      "greetings",
      "food",
      "travel",
      "work",
      "shopping",
      "health",
      "school",
      "hobbies",
      "weather",
      "phone",
    ])
    const itemIds = new Set<string>()
    for (const lesson of lessons) {
      expect(lesson.items).toHaveLength(15)
      expect(lesson.title.trim()).not.toBe("")
      for (const item of lesson.items) {
        const key = `${lesson.id}:${item.id}`
        expect(itemIds.has(key)).toBe(false)
        itemIds.add(key)
        expect(item.en.trim()).not.toBe("")
        expect(item.zh.trim()).not.toBe("")
        expect(item.ipa.startsWith("/")).toBe(true)
        expect(item.ipa.endsWith("/")).toBe(true)
      }
      const cards = vocabulary.filter((card) => card.topicId === lesson.id)
      expect(cards.length).toBeGreaterThanOrEqual(8)
    }
    const vocabIds = vocabulary.map((card) => card.id)
    expect(new Set(vocabIds).size).toBe(vocabIds.length)
  })

  it("gives every passage a level and three to five scored questions", () => {
    expect(readings.length).toBeGreaterThanOrEqual(6)
    const ids = new Set<string>()
    for (const passage of readings) {
      expect(ids.has(passage.id)).toBe(false)
      ids.add(passage.id)
      expect(levelOrder).toContain(passage.level)
      expect(passage.sentences.length).toBeGreaterThanOrEqual(5)
      expect(passage.questions.length).toBeGreaterThanOrEqual(3)
      expect(passage.questions.length).toBeLessThanOrEqual(5)
      for (const question of passage.questions) {
        expect(question.explanation.trim()).not.toBe("")
        expect(question.choices.map((choice) => choice.id)).toContain(question.answerId)
        expect(question.focusEn.trim()).not.toBe("")
        expect(question.focusZh.trim()).not.toBe("")
      }
    }
  })
})
