import { afterEach, describe, expect, it, vi } from "vitest"
import {
  accuracy,
  applyActivity,
  daySeries,
  emptyActivity,
  minutesFromSeconds,
  parseActivity,
  pruneActivity,
  rangeSummary,
  speakAverage,
  studySecondsToKeep,
  todayTotals,
  trend,
} from "./activity.ts"
import { ACTIVITY_KEY, loadActivity, recordPractice, saveActivity, snapshotMistakeCount } from "./activity-store.ts"

const today = "2026-11-25"

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

describe("activity log", () => {
  it("starts empty and ignores corrupt days", () => {
    expect(parseActivity(null)).toEqual(emptyActivity())
    expect(parseActivity("{")).toEqual(emptyActivity())
    const log = parseActivity({
      version: 1,
      days: {
        "2026-11-25": { items: 2, listenAttempts: 2, listenCorrect: 1, mistakeCount: 4, extra: true },
        "not-a-day": { items: 9 },
        "2026-11-24": { seconds: "12", items: -3 },
      },
    })
    expect(log.days["2026-11-25"]).toMatchObject({ items: 2, listenAttempts: 2, listenCorrect: 1, mistakeCount: 4 })
    expect(log.days["not-a-day"]).toBeUndefined()
    expect(log.days["2026-11-24"]).toMatchObject({ seconds: 0, items: 0, mistakeCount: null })
  })

  it("adds counts without dropping a mistake snapshot", () => {
    const started = applyActivity(emptyActivity(), today, { mistakeCount: 3 })
    const next = applyActivity(started, today, { listenAttempts: 1, listenCorrect: 1, items: 1, seconds: 40 })
    expect(started.days[today]?.items).toBe(0)
    expect(next.days[today]).toMatchObject({
      items: 1,
      listenAttempts: 1,
      listenCorrect: 1,
      seconds: 40,
      mistakeCount: 3,
    })
  })

  it("summarizes a 7-day window and leaves older days out", () => {
    let log = emptyActivity()
    log = applyActivity(log, "2026-11-18", { items: 9, listenAttempts: 1, listenCorrect: 1 })
    log = applyActivity(log, "2026-11-19", { items: 1, listenAttempts: 2, listenCorrect: 1, seconds: 90 })
    log = applyActivity(log, today, {
      items: 3,
      listenAttempts: 2,
      listenCorrect: 2,
      speakAttempts: 2,
      speakScoreSum: 150,
      grammarAttempts: 4,
      grammarCorrect: 1,
      readingAttempts: 2,
      readingCorrect: 1,
      cardsReviewed: 5,
      seconds: 130,
      mistakeCount: 6,
    })

    const points = trend(log, today, 7)
    expect(points).toHaveLength(7)
    expect(points[0]?.date).toBe("2026-11-19")
    expect(points[6]?.date).toBe(today)
    expect(points[0]?.items).toBe(1)
    expect(points[0]?.listenAccuracy).toBe(50)
    expect(points[1]?.items).toBe(0)
    expect(points[1]?.listenAccuracy).toBeNull()
    expect(points[1]?.mistakeCount).toBeNull()
    expect(points[1]?.recorded).toBe(false)
    expect(points[6]).toMatchObject({
      items: 3,
      minutes: 2,
      cardsReviewed: 5,
      listenAccuracy: 100,
      speakAverage: 75,
      grammarAccuracy: 25,
      readingAccuracy: 50,
      mistakeCount: 6,
    })

    const summary = rangeSummary(log, today, 7)
    expect(summary.items).toBe(4)
    expect(summary.minutes).toBe(3)
    expect(summary.cardsReviewed).toBe(5)
    expect(summary.listenAccuracy).toBe(75)
    expect(summary.speakAverage).toBe(75)
    expect(summary.grammarAccuracy).toBe(25)
    expect(summary.readingAccuracy).toBe(50)
    expect(summary.mistakeCount).toBe(6)
    expect(summary.recordedDays).toBe(2)
    expect(daySeries(log, today, 30)).toHaveLength(30)
    expect(accuracy(0, 0)).toBeNull()
    expect(speakAverage({ speakAttempts: 0, speakScoreSum: 10 })).toBeNull()
    expect(minutesFromSeconds(59)).toBe(0)
  })

  it("keeps only the recent window when saving", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", "{\"streak\":2}")
    mem.set("tingshuo.vocab.v1", "{\"version\":1}")
    mem.set("tingshuo.mistakes.v1", "{\"version\":1,\"items\":[]}")
    mem.set("tingshuo.grammar.v1", "{\"version\":1,\"topics\":{}}")
    mem.set("tingshuo.ai.v1", "{\"apiKey\":\"local-only\"}")

    recordPractice("2026-01-01", { items: 4 })
    recordPractice(today, { items: 1, listenAttempts: 1, listenCorrect: 0 })
    snapshotMistakeCount(today, 2)
    expect(loadActivity().days[today]).toMatchObject({ items: 1, listenAttempts: 1, mistakeCount: 2 })
    expect(loadActivity().days["2026-01-01"]).toBeUndefined()
    expect(todayTotals(loadActivity(), today)).toEqual({ items: 1, seconds: 0, minutes: 0 })
    expect(mem.get("tingshuo.progress.v1")).toBe("{\"streak\":2}")
    expect(mem.get("tingshuo.ai.v1")).toBe("{\"apiKey\":\"local-only\"}")
    expect(mem.get("tingshuo.vocab.v1")).toBe("{\"version\":1}")
    expect(mem.get("tingshuo.mistakes.v1")).toBe("{\"version\":1,\"items\":[]}")
    expect(mem.get("tingshuo.grammar.v1")).toBe("{\"version\":1,\"topics\":{}}")
    expect(JSON.parse(mem.get(ACTIVITY_KEY) ?? "{}").version).toBe(1)

    mem.set(ACTIVITY_KEY, "{")
    expect(loadActivity()).toEqual(emptyActivity())
    saveActivity(applyActivity(emptyActivity(), today, { items: 1 }))
    expect(pruneActivity(loadActivity(), "bad", 7).days[today]?.items).toBe(1)
  })

  it("ignores background time and very short gaps", () => {
    expect(studySecondsToKeep(15000, true)).toBe(15)
    expect(studySecondsToKeep(4999, true)).toBe(0)
    expect(studySecondsToKeep(15000, false)).toBe(0)
    expect(studySecondsToKeep(121000, true)).toBe(0)
  })
})
