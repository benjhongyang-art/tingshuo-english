import type { PracticeMode, SpeechRate } from "../types.ts"
import { emptyProgress, type ItemStat, type ProgressState } from "./progress.ts"

const PROGRESS_KEY = "tingshuo.progress.v1"
const LAST_KEY = "tingshuo.last"
const RATE_KEY = "tingshuo.rate"

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

export function loadProgress(): ProgressState {
  const raw = read(PROGRESS_KEY)
  if (!raw) return emptyProgress()
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState>
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
