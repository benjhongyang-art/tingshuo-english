import { useEffect } from "react"
import { useGoals } from "@/lib/goals-context.tsx"
import { isReminderDue } from "@/lib/goals.ts"
import { showDailyNotification, syncReminderWorker } from "@/lib/notify.ts"
import { calendarDay } from "@/lib/progress.ts"

/** Fires the daily reminder while the app is open, and tells the service worker the chosen time. */
export function ReminderAgent() {
  const { goal, markNotified } = useGoals()

  useEffect(() => {
    let cancelled = false
    const sync = () => {
      void syncReminderWorker({
        enabled: goal.reminderEnabled,
        time: goal.reminderTime,
        lastNotifiedDay: goal.lastNotifiedDay,
      })
    }
    const tick = () => {
      if (cancelled || !goal.reminderEnabled) return
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return
      if (!isReminderDue(new Date(), goal.reminderTime, goal.lastNotifiedDay)) return
      void showDailyNotification().then((shown) => {
        if (shown) markNotified(calendarDay(new Date()))
      })
    }
    sync()
    tick()
    const timer = window.setInterval(tick, 20000)
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; day?: string } | null
      if (data?.type === "tingshuo-reminder-fired" && typeof data.day === "string") markNotified(data.day)
    }
    navigator.serviceWorker?.addEventListener("message", onMessage)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      navigator.serviceWorker?.removeEventListener("message", onMessage)
    }
  }, [goal, markNotified])

  return null
}
