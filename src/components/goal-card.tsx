import { useState } from "react"
import { loadActivity } from "@/lib/activity-store.ts"
import { todayTotals } from "@/lib/activity.ts"
import { useGoals } from "@/lib/goals-context.tsx"
import { goalProgress, REMINDER_LIMITS, reminderStatus, type GoalKind } from "@/lib/goals.ts"
import { notificationPermission, requestNotificationPermission } from "@/lib/notify.ts"
import { calendarDay } from "@/lib/progress.ts"
import { Segmented } from "@/components/segmented.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"

export function GoalCard() {
  const { goal, updateGoal } = useGoals()
  const [open, setOpen] = useState(false)
  const [permission, setPermission] = useState(() => notificationPermission())
  const [today] = useState(() => calendarDay(new Date()))
  const totals = todayTotals(loadActivity(), today)
  const progress = goalProgress(goal, totals)

  async function enableReminder(enabled: boolean) {
    if (!enabled) {
      updateGoal({ reminderEnabled: false })
      return
    }
    const next = permission === "granted" ? "granted" : await requestNotificationPermission()
    setPermission(next)
    updateGoal({ reminderEnabled: true })
  }

  return (
    <section className="mt-4 rounded-[1.6rem] border bg-card p-4 shadow-sm" aria-label="今日目標">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">今日目標</p>
          <p className="mt-1 font-display text-3xl leading-none">
            {progress.current}
            <span className="text-lg text-muted-foreground">
              {" "}
              / {progress.target} {progress.unit}
            </span>
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {progress.met ? "今天的目標達成了。" : "再練一點就完成今天的目標。"}
            一題是一次聽力、發音、文法、閱讀、閃卡，或送出的一句對話。
          </p>
        </div>
        <Button type="button" variant="outline" className="h-10 bg-card px-3" onClick={() => setOpen((value) => !value)}>
          {open ? "收合" : "調整"}
        </Button>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={Math.min(progress.current, progress.target)}
        aria-label={`今日目標 ${progress.current} / ${progress.target} ${progress.unit}`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress.ratio * 100}%` }} />
      </div>

      {open && (
        <div className="mt-4 grid gap-4 border-t pt-4">
          <div>
            <p className="mb-2 text-sm font-medium">目標種類</p>
            <Segmented
              label="目標種類"
              value={goal.kind}
              onChange={(kind: GoalKind) => updateGoal({ kind })}
              options={[
                { value: "items", label: "題數" },
                { value: "minutes", label: "分鐘" },
              ]}
            />
          </div>
          <label className="block text-sm font-medium" htmlFor="daily-goal-target">
            {goal.kind === "items" ? "每天要完成幾題" : "每天要練習幾分鐘"}
            <Input
              id="daily-goal-target"
              className="mt-2 h-11 bg-card px-3 text-base md:text-base"
              inputMode="numeric"
              min={1}
              max={goal.kind === "items" ? 100 : 180}
              value={goal.target}
              onChange={(event) => updateGoal({ target: Number(event.target.value) })}
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium">每日提醒</p>
            <Segmented
              label="每日提醒"
              value={goal.reminderEnabled ? "on" : "off"}
              onChange={(value) => void enableReminder(value === "on")}
              options={[
                { value: "off", label: "關閉" },
                { value: "on", label: "開啟" },
              ]}
            />
            <label className="mt-3 block text-sm font-medium" htmlFor="daily-goal-time">
              提醒時間
              <input
                id="daily-goal-time"
                type="time"
                value={goal.reminderTime}
                onChange={(event) => {
                  if (event.target.value) updateGoal({ reminderTime: event.target.value })
                }}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
              />
            </label>
            <p className="mt-3 text-sm leading-6 text-muted-foreground" role="status">
              {reminderStatus(permission, goal.reminderEnabled)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{REMINDER_LIMITS}</p>
          </div>
        </div>
      )}
    </section>
  )
}
