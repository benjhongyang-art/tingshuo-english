export type ItemStat = {
  listenAttempts: number
  listenCorrect: number
  speakAttempts: number
  speakBest: number
}

export type ProgressState = {
  streak: number
  lastPracticeDate: string | null
  items: Record<string, ItemStat>
}

export type ProgressSummary = {
  practiced: number
  listenAttempts: number
  listenCorrect: number
  listenAccuracy: number | null
  speakAverage: number | null
  streak: number
}

export function emptyProgress(): ProgressState {
  return { streak: 0, lastPracticeDate: null, items: {} }
}

function emptyItem(): ItemStat {
  return { listenAttempts: 0, listenCorrect: 0, speakAttempts: 0, speakBest: 0 }
}

export function calendarDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function previousDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number)
  const value = new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1)
  value.setDate(value.getDate() - 1)
  return calendarDay(value)
}

export function markPracticed(state: ProgressState, today: string): ProgressState {
  if (state.lastPracticeDate === today) return state
  const streak = state.lastPracticeDate === previousDay(today) ? state.streak + 1 : 1
  return { ...state, streak, lastPracticeDate: today }
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function recordListen(
  state: ProgressState,
  itemId: string,
  correct: boolean,
  today: string,
): ProgressState {
  const next = markPracticed(state, today)
  const prev = next.items[itemId] ?? emptyItem()
  return {
    ...next,
    items: {
      ...next.items,
      [itemId]: {
        ...prev,
        listenAttempts: prev.listenAttempts + 1,
        listenCorrect: prev.listenCorrect + (correct ? 1 : 0),
      },
    },
  }
}

export function recordSpeak(
  state: ProgressState,
  itemId: string,
  score: number,
  today: string,
): ProgressState {
  const next = markPracticed(state, today)
  const prev = next.items[itemId] ?? emptyItem()
  const safeScore = clampScore(score)
  return {
    ...next,
    items: {
      ...next.items,
      [itemId]: {
        ...prev,
        speakAttempts: prev.speakAttempts + 1,
        speakBest: Math.max(prev.speakBest, safeScore),
      },
    },
  }
}

export function summarize(state: ProgressState): ProgressSummary {
  const stats = Object.values(state.items)
  const listenAttempts = stats.reduce((sum, stat) => sum + stat.listenAttempts, 0)
  const listenCorrect = stats.reduce((sum, stat) => sum + stat.listenCorrect, 0)
  const spoken = stats.filter((stat) => stat.speakAttempts > 0)
  return {
    practiced: stats.filter((stat) => stat.listenAttempts + stat.speakAttempts > 0).length,
    listenAttempts,
    listenCorrect,
    listenAccuracy: listenAttempts === 0 ? null : Math.round((listenCorrect / listenAttempts) * 100),
    speakAverage:
      spoken.length === 0
        ? null
        : Math.round(spoken.reduce((sum, stat) => sum + stat.speakBest, 0) / spoken.length),
    streak: state.streak,
  }
}

export function countPracticed(state: ProgressState, keys: string[]): number {
  return keys.filter((key) => {
    const stat = state.items[key]
    return !!stat && stat.listenAttempts + stat.speakAttempts > 0
  }).length
}
