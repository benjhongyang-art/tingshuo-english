import type { ReviewRating } from "./srs.ts"

export type MistakeSource = "listen" | "speak" | "card"

export type MistakeTarget = {
  kind: "lesson" | "card"
  topicId: string
  refId: string
  en: string
  zh: string
  ipa: string
  note?: string
}

export type MistakeEntry = {
  id: string
  sources: MistakeSource[]
  topicId: string
  kind: "lesson" | "card"
  refId: string
  en: string
  zh: string
  ipa: string
  note: string
  wrongCount: number
  correctStreak: number
  updatedAt: string
}

export type MistakeBook = {
  items: MistakeEntry[]
}

export type MistakeResult = {
  book: MistakeBook
  mastered: boolean
}

/** Pronunciation scores under this are collected. 60 sits below the "getting there" band. */
export const SPEAK_MISTAKE_THRESHOLD = 60

/** A pronunciation attempt at or above this counts as one correct review. */
export const SPEAK_MASTERY_THRESHOLD = 80

/** Correct reviews in a row before an item leaves the notebook. */
export const MASTERY_STREAK = 3

const SOURCE_ORDER: MistakeSource[] = ["listen", "speak", "card"]

export function emptyMistakeBook(): MistakeBook {
  return { items: [] }
}

export function mistakeId(target: Pick<MistakeTarget, "kind" | "topicId" | "refId">): string {
  return target.kind === "lesson" ? `lesson:${target.topicId}:${target.refId}` : `card:${target.refId}`
}

export function mistakeCount(book: MistakeBook): number {
  return book.items.length
}

export type MistakeFilter = {
  source?: MistakeSource | "all"
  topicId?: string | "all"
  id?: string
}

export function listMistakes(book: MistakeBook, filter: MistakeFilter = {}): MistakeEntry[] {
  const source = filter.source ?? "all"
  const topicId = filter.topicId ?? "all"
  return book.items
    .filter((item) => {
      if (filter.id && item.id !== filter.id) return false
      if (source !== "all" && !item.sources.includes(source)) return false
      if (topicId !== "all" && item.topicId !== topicId) return false
      return true
    })
    .slice()
    .sort((a, b) => {
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1
      if (a.wrongCount !== b.wrongCount) return b.wrongCount - a.wrongCount
      return a.en.localeCompare(b.en)
    })
}

export function removeMistake(book: MistakeBook, id: string): MistakeBook {
  if (!book.items.some((item) => item.id === id)) return book
  return { items: book.items.filter((item) => item.id !== id) }
}

export function recordListenOutcome(
  book: MistakeBook,
  target: MistakeTarget,
  correct: boolean,
  today: string,
): MistakeResult {
  if (!correct) return { book: markWrong(book, target, "listen", today), mastered: false }
  return markCorrect(book, target, today)
}

export function recordSpeakOutcome(
  book: MistakeBook,
  target: MistakeTarget,
  score: number,
  today: string,
): MistakeResult {
  const safe = clampScore(score)
  if (safe < SPEAK_MISTAKE_THRESHOLD) return { book: markWrong(book, target, "speak", today), mastered: false }
  if (safe >= SPEAK_MASTERY_THRESHOLD) return markCorrect(book, target, today)
  return { book, mastered: false }
}

export function recordCardOutcome(
  book: MistakeBook,
  target: MistakeTarget,
  rating: ReviewRating,
  today: string,
): MistakeResult {
  if (rating === "again") return { book: markWrong(book, target, "card", today), mastered: false }
  if (rating === "good") return markCorrect(book, target, today)
  return { book, mastered: false }
}

function markWrong(book: MistakeBook, target: MistakeTarget, source: MistakeSource, today: string): MistakeBook {
  const id = mistakeId(target)
  const existing = book.items.find((item) => item.id === id)
  const next: MistakeEntry = existing
    ? {
        ...existing,
        ...contentOf(target),
        sources: withSource(existing.sources, source),
        wrongCount: existing.wrongCount + 1,
        correctStreak: 0,
        updatedAt: today,
      }
    : {
        id,
        sources: [source],
        ...contentOf(target),
        wrongCount: 1,
        correctStreak: 0,
        updatedAt: today,
      }
  return { items: [next, ...book.items.filter((item) => item.id !== id)] }
}

function markCorrect(book: MistakeBook, target: MistakeTarget, today: string): MistakeResult {
  const id = mistakeId(target)
  const existing = book.items.find((item) => item.id === id)
  if (!existing) return { book, mastered: false }
  const correctStreak = existing.correctStreak + 1
  if (correctStreak >= MASTERY_STREAK) {
    return { book: { items: book.items.filter((item) => item.id !== id) }, mastered: true }
  }
  const next: MistakeEntry = {
    ...existing,
    ...contentOf(target),
    correctStreak,
    updatedAt: today,
  }
  return { book: { items: book.items.map((item) => (item.id === id ? next : item)) }, mastered: false }
}

function contentOf(target: MistakeTarget): Omit<MistakeEntry, "id" | "sources" | "wrongCount" | "correctStreak" | "updatedAt"> {
  return {
    topicId: target.topicId,
    kind: target.kind,
    refId: target.refId,
    en: target.en,
    zh: target.zh,
    ipa: target.ipa,
    note: target.note ?? "",
  }
}

function withSource(sources: MistakeSource[], source: MistakeSource): MistakeSource[] {
  if (sources.includes(source)) return sources
  return SOURCE_ORDER.filter((item) => item === source || sources.includes(item))
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}
