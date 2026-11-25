import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { calendarDay, recordListen, recordSpeak, summarize, type ProgressState } from "./progress.ts"
import { loadProgress, saveProgress } from "./storage.ts"

type ProgressApi = {
  state: ProgressState
  summary: ReturnType<typeof summarize>
  recordListen: (itemId: string, correct: boolean) => void
  recordSpeak: (itemId: string, score: number) => void
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

  const api = useMemo<ProgressApi>(() => {
    const today = () => calendarDay(new Date())
    return {
      state,
      summary: summarize(state),
      recordListen: (itemId, correct) => update((prev) => recordListen(prev, itemId, correct, today())),
      recordSpeak: (itemId, score) => update((prev) => recordSpeak(prev, itemId, score, today())),
    }
  }, [state, update])

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressApi {
  const api = useContext(ProgressContext)
  if (!api) throw new Error("useProgress 必須放在 ProgressProvider 裡")
  return api
}
