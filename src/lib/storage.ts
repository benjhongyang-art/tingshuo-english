import { vocabIds } from "../data/vocabulary.ts"
import type { PracticeMode, SpeechRate } from "../types.ts"
import {
  emptyMistakeBook,
  type MistakeBook,
  type MistakeEntry,
  type MistakeSource,
} from "./mistakes.ts"
import { calendarDay, emptyProgress, type ItemStat, type ProgressState } from "./progress.ts"
import { MIN_EASE, type CardSchedule } from "./srs.ts"

const PROGRESS_KEY = "tingshuo.progress.v1"
const LAST_KEY = "tingshuo.last"
const RATE_KEY = "tingshuo.rate"
const SCHEDULE_KEY = "tingshuo.vocab.v1"
const MISTAKE_KEY = "tingshuo.mistakes.v1"

const DAY = /^\d{4}-\d{2}-\d{2}$/
const SOURCES: MistakeSource[] = ["listen", "speak", "card"]

export type LastSession = {
  lessonId: string
  mode: PracticeMode
}

function read(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode and full storage should not block practice.
  }
}

function isItemStat(value: unknown): value is ItemStat {
  if (!value || typeof value !== "object") return false
  const stat = value as Partial<ItemStat>
  return [stat.listenAttempts, stat.listenCorrect, stat.speakAttempts, stat.speakBest].every(
    (item) => typeof item === "number" && Number.isFinite(item),
  )
}

/** Accepts the original progress payload and ignores fields added by later versions. */
export function parseProgress(raw: unknown): ProgressState {
  if (!raw || typeof raw !== "object") return emptyProgress()
  const parsed = raw as Partial<ProgressState>
  const items: Record<string, ItemStat> = {}
  if (parsed.items && typeof parsed.items === "object") {
    for (const [key, value] of Object.entries(parsed.items)) {
      if (isItemStat(value)) items[key] = value
    }
  }
  return {
    streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
    lastPracticeDate: typeof parsed.lastPracticeDate === "string" ? parsed.lastPracticeDate : null,
    items,
  }
}

export function loadProgress(): ProgressState {
  const raw = read(PROGRESS_KEY)
  if (!raw) return emptyProgress()
  try {
    return parseProgress(JSON.parse(raw))
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(state: ProgressState): void {
  write(PROGRESS_KEY, JSON.stringify(state))
}

export function loadLast(): LastSession | null {
  const raw = read(LAST_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<LastSession>
    if (typeof parsed.lessonId !== "string") return null
    if (parsed.mode !== "listen" && parsed.mode !== "speak") return null
    return { lessonId: parsed.lessonId, mode: parsed.mode }
  } catch {
    return null
  }
}

export function saveLast(session: LastSession): void {
  write(LAST_KEY, JSON.stringify(session))
}

export function loadRate(): SpeechRate {
  return read(RATE_KEY) === "normal" ? "normal" : "slow"
}

export function saveRate(rate: SpeechRate): void {
  write(RATE_KEY, rate)
}

function isDay(value: unknown): value is string {
  return typeof value === "string" && DAY.test(value)
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

export function parseSchedules(raw: unknown, today: string): Record<string, CardSchedule> {
  const cards = extractScheduleMap(raw)
  const schedules: Record<string, CardSchedule> = {}
  for (const [id, value] of Object.entries(cards)) {
    const schedule = parseSchedule(value, today)
    if (schedule) schedules[id] = schedule
  }
  return schedules
}

function extractScheduleMap(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const record = raw as Record<string, unknown>
  if (record.cards && typeof record.cards === "object" && !Array.isArray(record.cards)) {
    return record.cards as Record<string, unknown>
  }
  const cards: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "version" || key === "cards") continue
    cards[key] = value
  }
  return cards
}

function parseSchedule(value: unknown, today: string): CardSchedule | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<CardSchedule>
  const hasField = ["ease", "interval", "repetitions", "due", "lastReview"].some((key) => key in raw)
  if (!hasField) return null
  const ease = finiteNumber(raw.ease, 2.5)
  return {
    ease: Math.max(MIN_EASE, Math.round(ease * 100) / 100),
    interval: Math.max(0, Math.round(finiteNumber(raw.interval, 0))),
    repetitions: Math.max(0, Math.round(finiteNumber(raw.repetitions, 0))),
    due: isDay(raw.due) ? raw.due : today,
    lastReview: isDay(raw.lastReview) ? raw.lastReview : null,
  }
}

export function loadSchedules(today = calendarDay(new Date())): Record<string, CardSchedule> {
  const raw = read(SCHEDULE_KEY)
  if (!raw) return {}
  try {
    const parsed = parseSchedules(JSON.parse(raw), today)
    const known = new Set(vocabIds())
    return Object.fromEntries(Object.entries(parsed).filter(([id]) => known.has(id)))
  } catch {
    return {}
  }
}

export function saveSchedules(schedules: Record<string, CardSchedule>): void {
  write(SCHEDULE_KEY, JSON.stringify({ version: 1, cards: schedules }))
}

export function parseMistakeBook(raw: unknown): MistakeBook {
  const items = extractMistakeItems(raw)
  const seen = new Set<string>()
  const parsed: MistakeEntry[] = []
  for (const item of items) {
    const entry = parseMistake(item)
    if (!entry || seen.has(entry.id)) continue
    seen.add(entry.id)
    parsed.push(entry)
  }
  return { items: parsed }
}

function extractMistakeItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: unknown[] }).items
  }
  return []
}

function parseMistake(value: unknown): MistakeEntry | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Partial<MistakeEntry>
  if (raw.kind !== "lesson" && raw.kind !== "card") return null
  if (typeof raw.topicId !== "string" || typeof raw.refId !== "string") return null
  if (typeof raw.en !== "string" || raw.en.trim() === "") return null
  if (typeof raw.zh !== "string" || typeof raw.ipa !== "string") return null
  const sources = Array.isArray(raw.sources)
    ? SOURCES.filter((source) => raw.sources?.includes(source))
    : []
  const fallback: MistakeSource[] = raw.kind === "card" ? ["card"] : ["listen"]
  const wrongCount = Math.max(0, Math.round(finiteNumber(raw.wrongCount, 1)))
  const correctStreak = Math.max(0, Math.round(finiteNumber(raw.correctStreak, 0)))
  return {
    id: typeof raw.id === "string" && raw.id.trim() !== "" ? raw.id : `${raw.kind}:${raw.topicId}:${raw.refId}`,
    sources: sources.length > 0 ? sources : fallback,
    topicId: raw.topicId,
    kind: raw.kind,
    refId: raw.refId,
    en: raw.en,
    zh: raw.zh,
    ipa: raw.ipa,
    note: typeof raw.note === "string" ? raw.note : "",
    wrongCount,
    correctStreak,
    updatedAt: isDay(raw.updatedAt) ? raw.updatedAt : "1970-01-01",
  }
}

export function loadMistakes(): MistakeBook {
  const raw = read(MISTAKE_KEY)
  if (!raw) return emptyMistakeBook()
  try {
    return parseMistakeBook(JSON.parse(raw))
  } catch {
    return emptyMistakeBook()
  }
}

export function saveMistakes(book: MistakeBook): void {
  write(MISTAKE_KEY, JSON.stringify({ version: 1, items: book.items }))
}
