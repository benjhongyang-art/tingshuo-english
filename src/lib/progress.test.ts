import { describe, expect, it } from "vitest"
import { emptyProgress, markPracticed, recordListen, recordSpeak, summarize } from "./progress.ts"

describe("practice streak", () => {
  it("starts at one on the first day", () => {
    const next = markPracticed(emptyProgress(), "2026-11-25")
    expect(next.streak).toBe(1)
    expect(next.lastPracticeDate).toBe("2026-11-25")
  })

  it("does not increase twice on the same day", () => {
    const once = markPracticed(emptyProgress(), "2026-11-25")
    expect(markPracticed(once, "2026-11-25").streak).toBe(1)
  })

  it("increments across a month boundary", () => {
    const once = markPracticed(emptyProgress(), "2026-02-28")
    expect(markPracticed(once, "2026-03-01").streak).toBe(2)
  })

  it("resets after a missed day", () => {
    const once = markPracticed(emptyProgress(), "2026-11-20")
    expect(markPracticed(once, "2026-11-25").streak).toBe(1)
  })
})

describe("summarize", () => {
  it("averages listening accuracy and the best speaking score", () => {
    let state = emptyProgress()
    state = recordListen(state, "greetings:g01", true, "2026-11-25")
    state = recordListen(state, "greetings:g01", false, "2026-11-25")
    state = recordSpeak(state, "greetings:g01", 60, "2026-11-25")
    state = recordSpeak(state, "greetings:g01", 90, "2026-11-25")
    const summary = summarize(state)
    expect(summary.practiced).toBe(1)
    expect(summary.listenAccuracy).toBe(50)
    expect(summary.speakAverage).toBe(90)
    expect(summary.streak).toBe(1)
  })
})
