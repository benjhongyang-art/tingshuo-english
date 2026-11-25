import { calendarDay } from "./progress.ts"

/** SM-2 quality grades used by the three self-rating buttons. */
export type ReviewRating = "again" | "hard" | "good"

export type CardSchedule = {
  ease: number
  interval: number
  repetitions: number
  due: string
  lastReview: string | null
}

export type DueSummary = {
  due: number
  fresh: number
}

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

const QUALITY: Record<ReviewRating, number> = {
  again: 1,
  hard: 3,
  good: 5,
}

export function newSchedule(today: string): CardSchedule {
  return { ease: DEFAULT_EASE, interval: 0, repetitions: 0, due: today, lastReview: null }
}

export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number)
  const value = new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1)
  value.setDate(value.getDate() + days)
  return calendarDay(value)
}

function nextEase(ease: number, quality: number): number {
  const gap = 5 - quality
  const updated = ease + (0.1 - gap * (0.08 + gap * 0.02))
  const floored = Math.max(MIN_EASE, updated)
  return Math.round(floored * 100) / 100
}

/**
 * SuperMemo SM-2. A passing grade (模糊 / 記得) grows the interval
 * 1 day, then 6 days, then interval × ease. 忘記 resets the streak
 * and schedules the card for tomorrow.
 */
export function applyReview(card: CardSchedule, rating: ReviewRating, today: string): CardSchedule {
  const quality = QUALITY[rating]
  const ease = nextEase(card.ease, quality)
  if (quality < 3) {
    return { ease, interval: 1, repetitions: 0, due: addDays(today, 1), lastReview: today }
  }

  const repetitions = card.repetitions + 1
  let interval = 1
  if (card.repetitions === 1) interval = 6
  else if (card.repetitions > 1) interval = Math.max(1, Math.round(card.interval * ease))

  return { ease, interval, repetitions, due: addDays(today, interval), lastReview: today }
}

export function isDue(card: CardSchedule, today: string): boolean {
  return card.due <= today
}

export function summarizeDue(schedules: Record<string, CardSchedule>, ids: string[], today: string): DueSummary {
  let due = 0
  let fresh = 0
  for (const id of ids) {
    const card = schedules[id]
    if (card && card.due > today) continue
    due += 1
    if (!card || card.lastReview === null) fresh += 1
  }
  return { due, fresh }
}

export function dueCards<T extends { id: string }>(
  cards: T[],
  schedules: Record<string, CardSchedule>,
  today: string,
): T[] {
  return cards.filter((card) => {
    const schedule = schedules[card.id]
    return !schedule || isDue(schedule, today)
  })
}

export function intervalLabel(days: number): string {
  if (days <= 1) return "明天"
  return `${days} 天後`
}

export function nextDueDay(schedules: Record<string, CardSchedule>, ids: string[], today: string): string | null {
  let next: string | null = null
  for (const id of ids) {
    const card = schedules[id]
    if (!card || card.due <= today) continue
    if (!next || card.due < next) next = card.due
  }
  return next
}
