import type { ReadingPassage, ReadingQuestion } from "../data/readings.ts"
import { grammarAccuracy } from "./grammar.ts"
import type { MistakeTarget } from "./mistakes.ts"

export type ReadingTopicStat = {
  attempts: number
  correct: number
}

export type ReadingStats = {
  passages: Record<string, ReadingTopicStat>
}

export const READING_KEY = "tingshuo.reading.v1"

export function emptyReadingStats(): ReadingStats {
  return { passages: {} }
}

export function gradeReading(answerId: string, choiceId: string): boolean {
  return choiceId !== "" && choiceId === answerId
}

export function recordReadingAttempt(stats: ReadingStats, passageId: string, correct: boolean): ReadingStats {
  const prev = stats.passages[passageId] ?? { attempts: 0, correct: 0 }
  return {
    passages: {
      ...stats.passages,
      [passageId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
      },
    },
  }
}

export function summarizeReading(stats: ReadingStats): { attempts: number; correct: number; accuracy: number | null } {
  let attempts = 0
  let correct = 0
  for (const stat of Object.values(stats.passages)) {
    attempts += stat.attempts
    correct += stat.correct
  }
  return { attempts, correct, accuracy: grammarAccuracy(correct, attempts) }
}

export function passageAccuracy(stats: ReadingStats, passageId: string): number | null {
  const stat = stats.passages[passageId]
  if (!stat || stat.attempts === 0) return null
  return grammarAccuracy(stat.correct, stat.attempts)
}

export function readingMistakeTarget(
  passage: Pick<ReadingPassage, "id">,
  question: Pick<ReadingQuestion, "id" | "prompt" | "focusEn" | "focusZh" | "explanation">,
  given: string,
): MistakeTarget {
  const answer = given.trim()
  return {
    kind: "phrase",
    topicId: passage.id,
    refId: question.id,
    en: question.focusEn,
    zh: question.focusZh,
    ipa: "",
    note: answer ? `題目：${question.prompt}　你的答案：${answer}　說明：${question.explanation}` : `題目：${question.prompt}`,
  }
}

export type ReadingToken = {
  text: string
  lookup: string | null
}

export function tokenizeSentence(sentence: string): ReadingToken[] {
  const parts = sentence.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*|[^A-Za-z]+/g) ?? [sentence]
  return parts.map((text) => ({
    text,
    lookup: /[A-Za-z]/.test(text) ? text.toLowerCase().replace(/’/g, "'") : null,
  }))
}

export function lookupGloss(gloss: Record<string, string>, word: string): string | null {
  const key = word.toLowerCase().replace(/’/g, "'")
  const value = gloss[key]
  return value && value.trim() !== "" ? value : null
}

export function parseReadingStats(raw: unknown): ReadingStats {
  const passages: Record<string, ReadingTopicStat> = {}
  for (const [id, value] of Object.entries(extractPassages(raw))) {
    if (!id || !value || typeof value !== "object") continue
    const stat = value as Partial<ReadingTopicStat>
    const attempts = count(stat.attempts)
    const correct = count(stat.correct)
    if (attempts === null || correct === null || attempts === 0) continue
    passages[id] = { attempts, correct: Math.min(attempts, correct) }
  }
  return { passages }
}

function extractPassages(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const record = raw as Record<string, unknown>
  if (record.passages && typeof record.passages === "object" && !Array.isArray(record.passages)) {
    return record.passages as Record<string, unknown>
  }
  return {}
}

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}
