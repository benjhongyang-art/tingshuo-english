import { useEffect } from "react"
import { recordPractice } from "./activity-store.ts"
import { studySecondsToKeep } from "./activity.ts"
import { calendarDay } from "./progress.ts"

/** Counts visible practice time toward the daily minute goal. */
export function useStudyTimer() {
  useEffect(() => {
    let last = Date.now()
    const flush = (visible: boolean) => {
      const now = Date.now()
      const delta = now - last
      last = now
      const seconds = studySecondsToKeep(delta, visible)
      if (seconds <= 0) return
      recordPractice(calendarDay(new Date()), { seconds })
    }
    const id = window.setInterval(() => {
      flush(document.visibilityState !== "hidden")
    }, 15000)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush(true)
      else last = Date.now()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      flush(document.visibilityState !== "hidden")
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])
}
