import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { useProgress } from "./progress-context.tsx"
import { recordGrammarAttempt, summarizeGrammar, type GrammarStats } from "./grammar.ts"
import { loadGrammarStats, saveGrammarStats } from "./storage.ts"

type GrammarApi = {
  stats: GrammarStats
  summary: ReturnType<typeof summarizeGrammar>
  record: (topicId: string, correct: boolean) => void
}

const GrammarContext = createContext<GrammarApi | null>(null)

export function GrammarProvider({ children }: { children: ReactNode }) {
  const { markToday } = useProgress()
  const [stats, setStats] = useState<GrammarStats>(() => loadGrammarStats())

  const record = useCallback(
    (topicId: string, correct: boolean) => {
      setStats((prev) => {
        const next = recordGrammarAttempt(prev, topicId, correct)
        saveGrammarStats(next)
        return next
      })
      markToday()
    },
    [markToday],
  )

  const api = useMemo<GrammarApi>(() => ({ stats, summary: summarizeGrammar(stats), record }), [record, stats])

  return <GrammarContext.Provider value={api}>{children}</GrammarContext.Provider>
}

export function useGrammar(): GrammarApi {
  const api = useContext(GrammarContext)
  if (!api) throw new Error("useGrammar 必須放在 GrammarProvider 裡")
  return api
}
