import { previousDay } from "./progress.ts"

const DAY = /^\d{4}-\d{2}-\d{2}$/

export const ACTIVITY_KEEP_DAYS = 120

const COUNT_KEYS = [
  "listenAttempts",
  "listenCorrect",
  "speakAttempts",
  "speakScoreSum",
  "grammarAttempts",
  "grammarCorrect",
  "readingAttempts",
  "readingCorrect",
  "cardsReviewed",
  "items",
  "seconds",
] as const

type CountKey = (typeof COUNT_KEYS)[number]

export type ActivityCounts = Record<CountKey, number> & {
  mistakeCount: number | null
}

export type ActivityDay = ActivityCounts & {
  date: string
}

export type ActivityLog = {
  days: Record<string, ActivityDay>
}

export type ActivityPatch = Partial<ActivityCounts>

export function emptyCounts(): ActivityCounts {
  return {
    listenAttempts: 0,
    listenCorrect: 0,
    speakAttempts: 0,
    speakScoreSum: 0,
    grammarAttempts: 0,
    grammarCorrect: 0,
    readingAttempts: 0,
    readingCorrect: 0,
    cardsReviewed: 0,
    items: 0,
    seconds: 0,
    mistakeCount: null,
  }
}

export function emptyActivity(): ActivityLog {
  return { days: {} }
}

export function isActivityDay(value: string): boolean {
  return DAY.test(value)
}

function whole(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}

export function parseActivity(raw: unknown): ActivityLog {
  const source = extractDays(raw)
  const days: Record<string, ActivityDay> = {}
  for (const [key, value] of Object.entries(source)) {
    if (!isActivityDay(key) || !value || typeof value !== "object") continue
    const record = value as Partial<ActivityCounts>
    const counts = emptyCounts()
    for (const countKey of COUNT_KEYS) {
      const parsed = whole(record[countKey])
      if (parsed !== null) counts[countKey] = parsed
    }
    counts.mistakeCount = whole(record.mistakeCount)
    days[key] = { date: key, ...counts }
  }
  return { days }
}

function extractDays(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const record = raw as Record<string, unknown>
  if (record.days && typeof record.days === "object" && !Array.isArray(record.days)) {
    return record.days as Record<string, unknown>
  }
  return record
}

export function applyActivity(log: ActivityLog, date: string, patch: ActivityPatch): ActivityLog {
  if (!isActivityDay(date)) return log
  const prev = log.days[date] ?? { date, ...emptyCounts() }
  const next: ActivityDay = { ...prev, date }
  for (const key of COUNT_KEYS) {
    const value = patch[key]
    if (typeof value !== "number" || !Number.isFinite(value)) continue
    next[key] = Math.max(0, Math.round(prev[key] + value))
  }
  if ("mistakeCount" in patch) {
    const value = patch.mistakeCount
    next.mistakeCount = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : null
  }
  return { days: { ...log.days, [date]: next } }
}

export function recentDates(today: string, count: number): string[] {
  const total = Math.max(0, Math.round(count))
  const dates: string[] = []
  let cursor = today
  for (let index = 0; index < total; index += 1) {
    dates.push(cursor)
    cursor = previousDay(cursor)
  }
  return dates.reverse()
}

export function pruneActivity(log: ActivityLog, today: string, keep = ACTIVITY_KEEP_DAYS): ActivityLog {
  if (!isActivityDay(today)) return log
  const allowed = new Set(recentDates(today, keep))
  const days: Record<string, ActivityDay> = {}
  for (const [date, day] of Object.entries(log.days)) {
    if (allowed.has(date)) days[date] = day
  }
  return { days }
}

export function daySeries(log: ActivityLog, today: string, count: number): ActivityDay[] {
  return recentDates(today, count).map((date) => log.days[date] ?? { date, ...emptyCounts() })
}

export function accuracy(correct: number, attempts: number): number | null {
  if (!Number.isFinite(attempts) || attempts <= 0) return null
  if (!Number.isFinite(correct)) return null
  return Math.max(0, Math.min(100, Math.round((correct / attempts) * 100)))
}

export function speakAverage(counts: Pick<ActivityCounts, "speakAttempts" | "speakScoreSum">): number | null {
  if (counts.speakAttempts <= 0) return null
  return Math.max(0, Math.min(100, Math.round(counts.speakScoreSum / counts.speakAttempts)))
}

export function minutesFromSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return Math.floor(seconds / 60)
}

export type TrendPoint = {
  date: string
  label: string
  items: number
  minutes: number
  cardsReviewed: number
  listenAccuracy: number | null
  speakAverage: number | null
  grammarAccuracy: number | null
  readingAccuracy: number | null
  mistakeCount: number | null
  recorded: boolean
}

export function shortDateLabel(date: string): string {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

export function trend(log: ActivityLog, today: string, count: number): TrendPoint[] {
  return daySeries(log, today, count).map((day) => ({
    date: day.date,
    label: shortDateLabel(day.date),
    items: day.items,
    minutes: minutesFromSeconds(day.seconds),
    cardsReviewed: day.cardsReviewed,
    listenAccuracy: accuracy(day.listenCorrect, day.listenAttempts),
    speakAverage: speakAverage(day),
    grammarAccuracy: accuracy(day.grammarCorrect, day.grammarAttempts),
    readingAccuracy: accuracy(day.readingCorrect, day.readingAttempts),
    mistakeCount: day.mistakeCount,
    recorded: log.days[day.date] !== undefined,
  }))
}

export type RangeSummary = {
  items: number
  minutes: number
  cardsReviewed: number
  listenAccuracy: number | null
  speakAverage: number | null
  grammarAccuracy: number | null
  readingAccuracy: number | null
  mistakeCount: number | null
  recordedDays: number
}

export function rangeSummary(log: ActivityLog, today: string, count: number): RangeSummary {
  const days = daySeries(log, today, count)
  const sum = (pick: (day: ActivityDay) => number) => days.reduce((total, day) => total + pick(day), 0)
  let mistakeCount: number | null = null
  for (const day of days) {
    if (day.mistakeCount !== null) mistakeCount = day.mistakeCount
  }
  return {
    items: sum((day) => day.items),
    minutes: minutesFromSeconds(sum((day) => day.seconds)),
    cardsReviewed: sum((day) => day.cardsReviewed),
    listenAccuracy: accuracy(sum((day) => day.listenCorrect), sum((day) => day.listenAttempts)),
    speakAverage: speakAverage({
      speakAttempts: sum((day) => day.speakAttempts),
      speakScoreSum: sum((day) => day.speakScoreSum),
    }),
    grammarAccuracy: accuracy(sum((day) => day.grammarCorrect), sum((day) => day.grammarAttempts)),
    readingAccuracy: accuracy(sum((day) => day.readingCorrect), sum((day) => day.readingAttempts)),
    mistakeCount,
    recordedDays: days.filter((day) => log.days[day.date] !== undefined).length,
  }
}

export function todayTotals(log: ActivityLog, today: string): { items: number; seconds: number; minutes: number } {
  const day = log.days[today]
  if (!day) return { items: 0, seconds: 0, minutes: 0 }
  return { items: day.items, seconds: day.seconds, minutes: minutesFromSeconds(day.seconds) }
}

/** Ignore tiny gaps and long sleeps so a background tab does not inflate the timer. */
export function studySecondsToKeep(deltaMs: number, visible: boolean): number {
  if (!visible) return 0
  if (!Number.isFinite(deltaMs) || deltaMs < 5000 || deltaMs > 120000) return 0
  return Math.round(deltaMs / 1000)
}
