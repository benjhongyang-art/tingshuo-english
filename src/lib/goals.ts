import { minutesFromSeconds } from "./activity.ts"
import { calendarDay } from "./progress.ts"

export type GoalKind = "items" | "minutes"

export type DailyGoal = {
  kind: GoalKind
  target: number
  reminderEnabled: boolean
  reminderTime: string
  lastNotifiedDay: string | null
}

export const GOAL_KEY = "tingshuo.goals.v1"

export const DEFAULT_GOAL: DailyGoal = {
  kind: "items",
  target: 10,
  reminderEnabled: false,
  reminderTime: "20:00",
  lastNotifiedDay: null,
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

export function goalLimit(kind: GoalKind): number {
  return kind === "minutes" ? 180 : 100
}

export function clampGoalTarget(kind: GoalKind, value: number): number {
  const fallback = kind === "minutes" ? 15 : DEFAULT_GOAL.target
  if (!Number.isFinite(value)) return fallback
  return Math.min(goalLimit(kind), Math.max(1, Math.round(value)))
}

export function parseGoal(raw: unknown): DailyGoal {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_GOAL }
  const record = raw as Partial<DailyGoal>
  const kind: GoalKind = record.kind === "minutes" ? "minutes" : "items"
  const reminderTime =
    typeof record.reminderTime === "string" && TIME.test(record.reminderTime)
      ? record.reminderTime
      : DEFAULT_GOAL.reminderTime
  const lastNotifiedDay =
    typeof record.lastNotifiedDay === "string" && DAY.test(record.lastNotifiedDay) ? record.lastNotifiedDay : null
  return {
    kind,
    target: clampGoalTarget(kind, typeof record.target === "number" ? record.target : DEFAULT_GOAL.target),
    reminderEnabled: record.reminderEnabled === true,
    reminderTime,
    lastNotifiedDay,
  }
}

export type GoalProgress = {
  current: number
  target: number
  ratio: number
  met: boolean
  unit: "題" | "分鐘"
}

export function goalProgress(
  goal: Pick<DailyGoal, "kind" | "target">,
  totals: { items: number; seconds: number },
): GoalProgress {
  const target = clampGoalTarget(goal.kind, goal.target)
  const current =
    goal.kind === "minutes"
      ? minutesFromSeconds(totals.seconds)
      : Math.max(0, Math.round(Number.isFinite(totals.items) ? totals.items : 0))
  const ratio = target === 0 ? 0 : Math.max(0, Math.min(1, current / target))
  return {
    current,
    target,
    ratio,
    met: current >= target,
    unit: goal.kind === "minutes" ? "分鐘" : "題",
  }
}

/** True once the chosen clock time has arrived today and this device has not already notified. */
export function isReminderDue(now: Date, time: string, lastNotifiedDay: string | null): boolean {
  if (!TIME.test(time)) return false
  const today = calendarDay(now)
  if (lastNotifiedDay === today) return false
  const [hour, minute] = time.split(":").map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const targetMinutes = (hour ?? 0) * 60 + (minute ?? 0)
  return nowMinutes >= targetMinutes
}

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported"

export function reminderStatus(permission: NotificationPermissionState, enabled: boolean): string {
  if (!enabled) return "提醒已關閉。到了時間不會跳出通知。"
  if (permission === "unsupported") return "這個瀏覽器不支援系統通知。今天的進度仍會顯示在首頁。"
  if (permission === "denied") {
    return "通知權限被拒絕了。請到瀏覽器設定允許通知。在那之前不會跳出提醒，首頁仍會顯示今天的進度。"
  }
  if (permission === "default") return "請允許通知，才會在設定的時間提醒你。"
  return "App 開著時，到了時間會提醒一次。完全關掉之後，只有部分已安裝的瀏覽器能在背景提醒，而且時間不一定準。"
}

export const REMINDER_LIMITS =
  "每日提醒用的是瀏覽器通知，這個網站沒有後端，所以不能在完全關閉時保證準時。聽說開著（分頁或已安裝的畫面還在）時，到了你選的時間會跳出一次。把 App 完全關掉之後，只有支援「週期性背景同步」的瀏覽器（目前主要是已安裝到主畫面的 Chrome）才可能在背景提醒，系統也不保證準時。iPhone 和 iPad 在關掉之後通常不會提醒。如果按了不允許，或瀏覽器沒有通知功能，不會跳出系統通知，但首頁還是看得到今天的進度。"
