import type { ReviewRating } from "./srs.ts"

export const MISTAKE_SOURCES = ["listen", "speak", "card", "grammar", "chat"] as const

export type MistakeSource = (typeof MISTAKE_SOURCES)[number]

export const MISTAKE_KINDS = ["lesson", "card", "phrase"] as const

export type MistakeKind = (typeof MISTAKE_KINDS)[number]

export type MistakeTarget = {
  kind: MistakeKind
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
  kind: MistakeKind
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

const SOURCE_ORDER: readonly MistakeSource[] = MISTAKE_SOURCES

export function emptyMistakeBook(): MistakeBook {
  return { items: [] }
}

export function mistakeId(target: Pick<MistakeTarget, "kind" | "topicId" | "refId">): string {
  if (target.kind === "lesson") return `lesson:${target.topicId}:${target.refId}`
  if (target.kind === "card") return `card:${target.refId}`
  return `phrase:${target.topicId}:${target.refId}`
}

export function isMistakeSource(value: unknown): value is MistakeSource {
  return typeof value === "string" && (MISTAKE_SOURCES as readonly string[]).includes(value)
}

export function parseMistakeSource(value: string | null | undefined): MistakeSource | "all" {
  return isMistakeSource(value) ? value : "all"
}

/** Stable id for a corrected sentence, so the same phrase is not collected twice. */
export function phraseKey(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ")
  let hash = 2166136261
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function chatPhraseTarget(input: {
  topicId: string
  correction: string
  correctionZh: string | null
  learnerText: string
}): MistakeTarget {
  const correction = input.correction.trim()
  return {
    kind: "phrase",
    topicId: input.topicId,
    refId: phraseKey(correction),
    en: correction,
    zh: input.correctionZh?.trim() || "對話裡改正的句子",
    ipa: "",
    note: learnerNote(input.learnerText),
  }
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

export function recordGrammarOutcome(
  book: MistakeBook,
  target: MistakeTarget,
  correct: boolean,
  today: string,
): MistakeResult {
  const phrase: MistakeTarget = { ...target, kind: "phrase", ipa: target.ipa ?? "" }
  if (!correct) return { book: markWrong(book, phrase, "grammar", today), mastered: false }
  return markCorrect(book, phrase, today)
}

/** Saves a tutor correction once. A second save of the same sentence does nothing. */
export function collectChatPhrase(book: MistakeBook, target: MistakeTarget, today: string): MistakeBook {
  const phrase: MistakeTarget = {
    ...target,
    kind: "phrase",
    en: target.en.trim(),
    zh: target.zh.trim() || "對話裡改正的句子",
    ipa: target.ipa ?? "",
  }
  if (!phrase.en) return book
  if (book.items.some((item) => item.id === mistakeId(phrase))) return book
  return markWrong(book, phrase, "chat", today)
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

function learnerNote(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ")
  if (!trimmed) return ""
  const short = trimmed.length > 160 ? `${trimmed.slice(0, 159)}…` : trimmed
  return `你說：${short}`
}

function withSource(sources: MistakeSource[], source: MistakeSource): MistakeSource[] {
  if (sources.includes(source)) return sources
  return SOURCE_ORDER.filter((item) => item === source || sources.includes(item))
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}
