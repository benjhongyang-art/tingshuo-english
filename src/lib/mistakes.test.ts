import { describe, expect, it } from "vitest"
import {
  emptyMistakeBook,
  listMistakes,
  MASTERY_STREAK,
  mistakeCount,
  recordCardOutcome,
  recordListenOutcome,
  recordSpeakOutcome,
  removeMistake,
  SPEAK_MASTERY_THRESHOLD,
  SPEAK_MISTAKE_THRESHOLD,
  type MistakeTarget,
} from "./mistakes.ts"

const today = "2026-11-25"

const sentence: MistakeTarget = {
  kind: "lesson",
  topicId: "greetings",
  refId: "g01",
  en: "Hello.",
  zh: "你好。",
  ipa: "/həˈloʊ/",
}

const word: MistakeTarget = {
  kind: "card",
  topicId: "food",
  refId: "food:coffee",
  en: "coffee",
  zh: "咖啡",
  ipa: "/ˈkɔfi/",
  note: "I'd like a coffee, please.",
}

function wrongs(target: MistakeTarget, times: number) {
  let book = emptyMistakeBook()
  for (let index = 0; index < times; index += 1) {
    book = recordListenOutcome(book, target, false, today).book
  }
  return book
}

describe("mistake collection", () => {
  it("collects a missed listening item and ignores a correct one that was never missed", () => {
    const empty = emptyMistakeBook()
    expect(recordListenOutcome(empty, sentence, true, today).book).toBe(empty)

    const book = recordListenOutcome(empty, sentence, false, today).book
    expect(mistakeCount(book)).toBe(1)
    expect(book.items[0]).toMatchObject({
      id: "lesson:greetings:g01",
      sources: ["listen"],
      en: "Hello.",
      zh: "你好。",
      wrongCount: 1,
      correctStreak: 0,
      note: "",
    })
  })

  it("merges a later pronunciation miss into the same item and resets the streak", () => {
    let book = wrongs(sentence, 1)
    book = recordListenOutcome(book, sentence, true, today).book
    expect(book.items[0]?.correctStreak).toBe(1)

    book = recordSpeakOutcome(book, sentence, SPEAK_MISTAKE_THRESHOLD - 1, today).book
    expect(book.items).toHaveLength(1)
    expect(book.items[0]).toMatchObject({
      sources: ["listen", "speak"],
      wrongCount: 2,
      correctStreak: 0,
    })
  })

  it("uses 60 as the pronunciation floor and 80 as a successful review", () => {
    const empty = emptyMistakeBook()
    expect(recordSpeakOutcome(empty, sentence, SPEAK_MISTAKE_THRESHOLD, today).book).toBe(empty)
    expect(recordSpeakOutcome(empty, sentence, 79.4, today).book).toBe(empty)

    const added = recordSpeakOutcome(empty, sentence, 59.4, today).book
    expect(added.items[0]?.sources).toEqual(["speak"])

    const neutral = recordSpeakOutcome(added, sentence, 70, today)
    expect(neutral.book).toBe(added)

    const passed = recordSpeakOutcome(added, sentence, SPEAK_MASTERY_THRESHOLD, today).book
    expect(passed.items[0]?.correctStreak).toBe(1)
    expect(recordSpeakOutcome(added, sentence, 79.6, today).book.items[0]?.correctStreak).toBe(1)
  })

  it("treats a non-numeric pronunciation score as a miss", () => {
    const book = recordSpeakOutcome(emptyMistakeBook(), sentence, Number.NaN, today).book
    expect(book.items[0]?.wrongCount).toBe(1)
  })

  it("removes an item after three correct reviews and a miss starts the streak over", () => {
    let book = wrongs(sentence, 1)
    book = recordListenOutcome(book, sentence, true, today).book
    book = recordListenOutcome(book, sentence, true, today).book
    expect(book.items[0]?.correctStreak).toBe(2)

    book = recordListenOutcome(book, sentence, false, today).book
    expect(book.items[0]).toMatchObject({ correctStreak: 0, wrongCount: 2 })

    for (let index = 0; index < MASTERY_STREAK - 1; index += 1) {
      const step = recordListenOutcome(book, sentence, true, today)
      expect(step.mastered).toBe(false)
      book = step.book
    }
    const last = recordListenOutcome(book, sentence, true, today)
    expect(last.mastered).toBe(true)
    expect(mistakeCount(last.book)).toBe(0)

    const stayed = recordListenOutcome(last.book, sentence, true, today)
    expect(stayed.book).toBe(last.book)
  })

  it("collects a forgotten flashcard and clears it after three 記得 ratings", () => {
    const empty = emptyMistakeBook()
    expect(recordCardOutcome(empty, word, "hard", today).book).toBe(empty)
    expect(recordCardOutcome(empty, word, "good", today).book).toBe(empty)

    let book = recordCardOutcome(empty, word, "again", today).book
    expect(book.items[0]).toMatchObject({
      id: "card:food:coffee",
      kind: "card",
      sources: ["card"],
      note: "I'd like a coffee, please.",
      zh: "咖啡",
    })

    book = recordCardOutcome(book, word, "hard", today).book
    expect(book.items[0]?.correctStreak).toBe(0)

    for (let index = 0; index < MASTERY_STREAK; index += 1) {
      book = recordCardOutcome(book, word, "good", today).book
    }
    expect(mistakeCount(book)).toBe(0)
  })

  it("filters by source and topic, and supports a manual remove", () => {
    let book = recordListenOutcome(emptyMistakeBook(), sentence, false, today).book
    book = recordCardOutcome(book, word, "again", "2026-11-24").book

    expect(listMistakes(book, { source: "card" }).map((item) => item.id)).toEqual(["card:food:coffee"])
    expect(listMistakes(book, { topicId: "greetings" }).map((item) => item.id)).toEqual(["lesson:greetings:g01"])
    expect(listMistakes(book).map((item) => item.id)).toEqual(["lesson:greetings:g01", "card:food:coffee"])

    const removed = removeMistake(book, "lesson:greetings:g01")
    expect(mistakeCount(removed)).toBe(1)
    expect(removeMistake(removed, "missing")).toBe(removed)
  })
})
