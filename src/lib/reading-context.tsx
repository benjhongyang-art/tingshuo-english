import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { recordPractice } from "./activity-store.ts"
import { useProgress } from "./progress-context.tsx"
import { calendarDay } from "./progress.ts"
import { loadReadingStats, saveReadingStats } from "./reading-store.ts"
import { recordReadingAttempt, summarizeReading, type ReadingStats } from "./reading.ts"

type ReadingApi = {
  stats: ReadingStats
  summary: ReturnType<typeof summarizeReading>
  record: (passageId: string, correct: boolean) => void
}

const ReadingContext = createContext<ReadingApi | null>(null)

export function ReadingProvider({ children }: { children: ReactNode }) {
  const { markToday } = useProgress()
  const [stats, setStats] = useState<ReadingStats>(() => loadReadingStats())

  const record = useCallback(
    (passageId: string, correct: boolean) => {
      recordPractice(calendarDay(new Date()), {
        readingAttempts: 1,
        readingCorrect: correct ? 1 : 0,
        items: 1,
      })
      setStats((prev) => {
        const next = recordReadingAttempt(prev, passageId, correct)
        saveReadingStats(next)
        return next
      })
      markToday()
    },
    [markToday],
  )

  const api = useMemo<ReadingApi>(() => ({ stats, summary: summarizeReading(stats), record }), [record, stats])

  return <ReadingContext.Provider value={api}>{children}</ReadingContext.Provider>
}

export function useReading(): ReadingApi {
  const api = useContext(ReadingContext)
  if (!api) throw new Error("useReading 必須放在 ReadingProvider 裡")
  return api
}
