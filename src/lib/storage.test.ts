import { afterEach, describe, expect, it, vi } from "vitest"
import { calendarDay } from "./progress.ts"
import {
  loadMistakes,
  loadProgress,
  loadSchedules,
  parseMistakeBook,
  parseProgress,
  parseSchedules,
  saveMistakes,
  saveProgress,
  saveSchedules,
} from "./storage.ts"

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

describe("progress migration", () => {
  it("keeps a progress record written before flashcards and the mistake notebook", () => {
    const mem = installStorage()
    const original = {
      streak: 4,
      lastPracticeDate: "2026-11-24",
      items: {
        "greetings:g01": { listenAttempts: 3, listenCorrect: 2, speakAttempts: 1, speakBest: 88 },
      },
      cards: { leftover: true },
    }
    mem.set("tingshuo.progress.v1", JSON.stringify(original))

    const loaded = loadProgress()
    expect(loaded).toEqual({
      streak: 4,
      lastPracticeDate: "2026-11-24",
      items: {
        "greetings:g01": { listenAttempts: 3, listenCorrect: 2, speakAttempts: 1, speakBest: 88 },
      },
    })

    saveProgress(loaded)
    expect(loadProgress()).toEqual(loaded)
    expect(mem.has("tingshuo.vocab.v1")).toBe(false)
    expect(mem.has("tingshuo.mistakes.v1")).toBe(false)
    expect(JSON.parse(mem.get("tingshuo.progress.v1") ?? "{}")).not.toHaveProperty("cards")
  })

  it("drops broken item stats and survives corrupt JSON", () => {
    expect(
      parseProgress({
        streak: 2,
        lastPracticeDate: "2026-11-25",
        items: {
          ok: { listenAttempts: 1, listenCorrect: 1, speakAttempts: 0, speakBest: 0 },
          bad: { listenAttempts: "1" },
        },
      }).items,
    ).toEqual({
      ok: { listenAttempts: 1, listenCorrect: 1, speakAttempts: 0, speakBest: 0 },
    })

    const mem = installStorage()
    mem.set("tingshuo.progress.v1", "{")
    expect(loadProgress()).toEqual({ streak: 0, lastPracticeDate: null, items: {} })
  })
})

describe("vocab and mistake migration", () => {
  it("reads an unversioned schedule map and writes the versioned envelope", () => {
    const mem = installStorage()
    mem.set(
      "tingshuo.vocab.v1",
      JSON.stringify({
        "greetings:hello": { ease: 1.1, interval: 4, repetitions: 2, due: "2026-12-01", lastReview: "2026-11-20" },
        removed: { ease: 2.5, interval: 1, repetitions: 1, due: "2026-11-26", lastReview: "2026-11-25" },
      }),
    )

    const loaded = loadSchedules("2026-11-25")
    expect(loaded["greetings:hello"]).toEqual({
      ease: 1.3,
      interval: 4,
      repetitions: 2,
      due: "2026-12-01",
      lastReview: "2026-11-20",
    })
    expect(loaded.removed).toBeUndefined()

    saveSchedules(loaded)
    expect(JSON.parse(mem.get("tingshuo.vocab.v1") ?? "{}")).toEqual({ version: 1, cards: loaded })
    expect(mem.has("tingshuo.progress.v1")).toBe(false)
  })

  it("repairs a missing due date without throwing away the card", () => {
    const parsed = parseSchedules({ "food:tea": { repetitions: 1, due: "tomorrow" } }, "2026-11-25")
    expect(parsed["food:tea"]).toMatchObject({ due: "2026-11-25", repetitions: 1, ease: 2.5, lastReview: null })
  })

  it("reads a raw mistake list and keeps only usable entries", () => {
    const book = parseMistakeBook([
      {
        id: "lesson:greetings:g01",
        sources: ["listen", "nope"],
        topicId: "greetings",
        kind: "lesson",
        refId: "g01",
        en: "Hello.",
        zh: "你好。",
        ipa: "/həˈloʊ/",
        wrongCount: 2,
        correctStreak: 1,
        updatedAt: "2026-11-25",
      },
      { kind: "card", topicId: "food", refId: "food:tea", en: "", zh: "茶", ipa: "/ti/" },
      { kind: "nope", en: "Hi." },
    ])
    expect(book.items).toEqual([
      {
        id: "lesson:greetings:g01",
        sources: ["listen"],
        topicId: "greetings",
        kind: "lesson",
        refId: "g01",
        en: "Hello.",
        zh: "你好。",
        ipa: "/həˈloʊ/",
        note: "",
        wrongCount: 2,
        correctStreak: 1,
        updatedAt: "2026-11-25",
      },
    ])
  })

  it("round-trips the mistake notebook in its own key", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", JSON.stringify({ streak: 1, lastPracticeDate: "2026-11-25", items: {} }))
    const book = parseMistakeBook([
      {
        kind: "card",
        topicId: "food",
        refId: "food:tea",
        en: "tea",
        zh: "茶",
        ipa: "/ti/",
        note: "One bubble tea, less ice.",
        sources: ["card"],
        wrongCount: 1,
        correctStreak: 0,
        updatedAt: "2026-11-25",
      },
    ])
    saveMistakes(book)
    expect(loadMistakes()).toEqual(book)
    expect(loadProgress().streak).toBe(1)
    expect(JSON.parse(mem.get("tingshuo.mistakes.v1") ?? "{}").version).toBe(1)
  })

  it("uses today when a stored due date is repaired through loadSchedules", () => {
    const mem = installStorage()
    mem.set("tingshuo.vocab.v1", JSON.stringify({ cards: { "food:tea": { interval: 0 } } }))
    expect(loadSchedules()["food:tea"]?.due).toBe(calendarDay(new Date()))
  })
})
