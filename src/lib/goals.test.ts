import { afterEach, describe, expect, it, vi } from "vitest"
import { loadGoal, saveGoal } from "./goal-store.ts"
import {
  DEFAULT_GOAL,
  GOAL_KEY,
  clampGoalTarget,
  goalProgress,
  isReminderDue,
  parseGoal,
  reminderStatus,
} from "./goals.ts"

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

describe("daily goals", () => {
  it("repairs a broken goal without inventing a reminder", () => {
    expect(parseGoal(null)).toEqual(DEFAULT_GOAL)
    expect(parseGoal("{")).toEqual(DEFAULT_GOAL)
    expect(
      parseGoal({
        kind: "minutes",
        target: 400,
        reminderEnabled: "yes",
        reminderTime: "25:99",
        lastNotifiedDay: "yesterday",
      }),
    ).toEqual({
      kind: "minutes",
      target: 180,
      reminderEnabled: false,
      reminderTime: "20:00",
      lastNotifiedDay: null,
    })
    expect(clampGoalTarget("items", 0)).toBe(1)
    expect(clampGoalTarget("items", Number.NaN)).toBe(10)
  })

  it("measures items and whole minutes against the target", () => {
    expect(goalProgress({ kind: "items", target: 10 }, { items: 4, seconds: 30 })).toMatchObject({
      current: 4,
      target: 10,
      met: false,
      unit: "題",
    })
    expect(goalProgress({ kind: "items", target: 4 }, { items: 4, seconds: 0 }).met).toBe(true)
    expect(goalProgress({ kind: "items", target: 4 }, { items: 4, seconds: 0 }).ratio).toBe(1)
    expect(goalProgress({ kind: "minutes", target: 15 }, { items: 9, seconds: 59 })).toMatchObject({
      current: 0,
      met: false,
      unit: "分鐘",
    })
    expect(goalProgress({ kind: "minutes", target: 1 }, { items: 0, seconds: 60 })).toMatchObject({
      current: 1,
      met: true,
    })
    expect(goalProgress({ kind: "items", target: 2 }, { items: 8, seconds: 0 }).ratio).toBe(1)
  })

  it("notifies once after the chosen time", () => {
    const morning = new Date(2026, 10, 25, 7, 30)
    const evening = new Date(2026, 10, 25, 20, 0)
    const later = new Date(2026, 10, 25, 21, 5)
    expect(isReminderDue(morning, "20:00", null)).toBe(false)
    expect(isReminderDue(evening, "20:00", null)).toBe(true)
    expect(isReminderDue(later, "20:00", null)).toBe(true)
    expect(isReminderDue(later, "20:00", "2026-11-25")).toBe(false)
    expect(isReminderDue(later, "20:00", "2026-11-24")).toBe(true)
    expect(isReminderDue(later, "8pm", null)).toBe(false)
  })

  it("keeps the goal beside the older records", () => {
    const mem = installStorage()
    mem.set("tingshuo.progress.v1", "{\"streak\":4}")
    mem.set("tingshuo.vocab.v1", "{\"version\":1}")
    mem.set("tingshuo.mistakes.v1", "{\"items\":[]}")
    mem.set("tingshuo.grammar.v1", "{\"topics\":{}}")
    mem.set("tingshuo.ai.v1", "{\"apiKey\":\"stay\"}")
    expect(loadGoal()).toEqual(DEFAULT_GOAL)
    saveGoal({ ...DEFAULT_GOAL, kind: "minutes", target: 20, reminderEnabled: true, reminderTime: "07:30" })
    expect(loadGoal()).toMatchObject({ kind: "minutes", target: 20, reminderEnabled: true, reminderTime: "07:30" })
    expect(mem.get("tingshuo.progress.v1")).toBe("{\"streak\":4}")
    expect(mem.get("tingshuo.ai.v1")).toBe("{\"apiKey\":\"stay\"}")
    expect(mem.get("tingshuo.vocab.v1")).toBe("{\"version\":1}")
    expect(mem.get("tingshuo.mistakes.v1")).toBe("{\"items\":[]}")
    expect(mem.get("tingshuo.grammar.v1")).toBe("{\"topics\":{}}")
    expect(JSON.parse(mem.get(GOAL_KEY) ?? "{}").version).toBe(1)
    mem.set(GOAL_KEY, "{")
    expect(loadGoal()).toEqual(DEFAULT_GOAL)
  })

  it("explains a denied or missing notification permission", () => {
    expect(reminderStatus("denied", true)).toContain("拒絕")
    expect(reminderStatus("unsupported", true)).toContain("不支援")
    expect(reminderStatus("granted", false)).toContain("關閉")
    expect(reminderStatus("granted", true)).toContain("開著")
  })
})
