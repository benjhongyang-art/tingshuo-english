import type { MistakeTarget } from "./mistakes.ts"

export type GrammarKind = "choice" | "blank"

export type GrammarQuestion = {
  id: string
  topicId: string
  kind: GrammarKind
  prompt: string
  sentence: string
  choices?: string[]
  answer: string
  accept?: string[]
  correctSentence: string
  explanation: string
}

export type GrammarTopicStat = {
  attempts: number
  correct: number
}

export type GrammarStats = {
  topics: Record<string, GrammarTopicStat>
}

export function emptyGrammarStats(): GrammarStats {
  return { topics: {} }
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[.?!。！？]+$/g, "")
    .replace(/\s+/g, " ")
}

export function gradeGrammar(
  question: Pick<GrammarQuestion, "kind" | "answer" | "accept">,
  input: string,
): boolean {
  const given = input.trim()
  if (!given) return false
  if (question.kind === "choice") return given === question.answer
  const accepted = [question.answer, ...(question.accept ?? [])].map(normalizeAnswer).filter((item) => item !== "")
  return accepted.includes(normalizeAnswer(given))
}

export function grammarAccuracy(correct: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((correct / total) * 100)
}

export function recordGrammarAttempt(stats: GrammarStats, topicId: string, correct: boolean): GrammarStats {
  const prev = stats.topics[topicId] ?? { attempts: 0, correct: 0 }
  return {
    topics: {
      ...stats.topics,
      [topicId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
      },
    },
  }
}

export function summarizeGrammar(stats: GrammarStats): { attempts: number; correct: number; accuracy: number | null } {
  let attempts = 0
  let correct = 0
  for (const stat of Object.values(stats.topics)) {
    attempts += stat.attempts
    correct += stat.correct
  }
  return { attempts, correct, accuracy: grammarAccuracy(correct, attempts) }
}

export function topicAccuracy(stats: GrammarStats, topicId: string): number | null {
  const stat = stats.topics[topicId]
  if (!stat || stat.attempts === 0) return null
  return grammarAccuracy(stat.correct, stat.attempts)
}

export function grammarMistakeTarget(question: GrammarQuestion, given?: string): MistakeTarget {
  const attempt = given?.trim()
  return {
    kind: "phrase",
    topicId: question.topicId,
    refId: question.id,
    en: question.correctSentence,
    zh: question.explanation,
    ipa: "",
    note: attempt ? `題目：${question.sentence}　你的答案：${attempt}` : `題目：${question.sentence}`,
  }
}

export function parseGrammarStats(raw: unknown): GrammarStats {
  const topics: Record<string, GrammarTopicStat> = {}
  for (const [id, value] of Object.entries(extractTopics(raw))) {
    if (!id || !value || typeof value !== "object") continue
    const stat = value as Partial<GrammarTopicStat>
    const attempts = count(stat.attempts)
    const correct = count(stat.correct)
    if (attempts === null || correct === null || attempts === 0) continue
    topics[id] = { attempts, correct: Math.min(attempts, correct) }
  }
  return { topics }
}

function extractTopics(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const record = raw as Record<string, unknown>
  if (record.topics && typeof record.topics === "object" && !Array.isArray(record.topics)) {
    return record.topics as Record<string, unknown>
  }
  if ("version" in record) return {}
  return record
}

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(0, Math.round(value))
}
