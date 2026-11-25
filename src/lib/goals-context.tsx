import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { loadGoal, saveGoal } from "./goal-store.ts"
import { parseGoal, type DailyGoal } from "./goals.ts"

type GoalsApi = {
  goal: DailyGoal
  updateGoal: (patch: Partial<DailyGoal>) => void
  markNotified: (day: string) => void
}

const GoalsContext = createContext<GoalsApi | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<DailyGoal>(() => loadGoal())

  const updateGoal = useCallback((patch: Partial<DailyGoal>) => {
    setGoal((prev) => {
      const next = parseGoal({ ...prev, ...patch })
      saveGoal(next)
      return next
    })
  }, [])

  const markNotified = useCallback((day: string) => {
    setGoal((prev) => {
      if (prev.lastNotifiedDay === day) return prev
      const next = { ...prev, lastNotifiedDay: day }
      saveGoal(next)
      return next
    })
  }, [])

  const api = useMemo<GoalsApi>(() => ({ goal, updateGoal, markNotified }), [goal, markNotified, updateGoal])

  return <GoalsContext.Provider value={api}>{children}</GoalsContext.Provider>
}

export function useGoals(): GoalsApi {
  const api = useContext(GoalsContext)
  if (!api) throw new Error("useGoals 必須放在 GoalsProvider 裡")
  return api
}
