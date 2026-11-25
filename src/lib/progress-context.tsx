import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { recordPractice } from "./activity-store.ts"
import { calendarDay, markPracticed, recordListen, recordSpeak, summarize, type ProgressState } from "./progress.ts"
import { loadProgress, saveProgress } from "./storage.ts"

type ProgressApi = {
  state: ProgressState
  summary: ReturnType<typeof summarize>
  recordListen: (itemId: string, correct: boolean) => void
  recordSpeak: (itemId: string, score: number) => void
  markToday: () => void
}

const ProgressContext = createContext<ProgressApi | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => loadProgress())

  const update = useCallback((change: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = change(prev)
      saveProgress(next)
      return next
    })
  }, [])

  const markToday = useCallback(() => {
    update((prev) => markPracticed(prev, calendarDay(new Date())))
  }, [update])

  const api = useMemo<ProgressApi>(() => {
    const today = () => calendarDay(new Date())
    return {
      state,
      summary: summarize(state),
      recordListen: (itemId, correct) => {
        const day = today()
        recordPractice(day, { listenAttempts: 1, listenCorrect: correct ? 1 : 0, items: 1 })
        update((prev) => recordListen(prev, itemId, correct, day))
      },
      recordSpeak: (itemId, score) => {
        const day = today()
        const safe = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
        recordPractice(day, { speakAttempts: 1, speakScoreSum: safe, items: 1 })
        update((prev) => recordSpeak(prev, itemId, score, day))
      },
      markToday,
    }
  }, [markToday, state, update])

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const api = useContext(ProgressContext)
  if (!api) throw new Error("useProgress 必須放在 ProgressProvider 裡")
  return api
}
