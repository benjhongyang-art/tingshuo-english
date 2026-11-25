import {
  applyActivity,
  emptyActivity,
  parseActivity,
  pruneActivity,
  type ActivityLog,
  type ActivityPatch,
} from "./activity.ts"

export const ACTIVITY_KEY = "tingshuo.activity.v1"

function read(): string | null {
  try {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(ACTIVITY_KEY)
  } catch {
    return null
  }
}

function write(value: string): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, value)
  } catch {
    // Private mode and full storage should not block practice.
  }
}

export function loadActivity(): ActivityLog {
  const raw = read()
  if (!raw) return emptyActivity()
  try {
    return parseActivity(JSON.parse(raw))
  } catch {
    return emptyActivity()
  }
}

export function saveActivity(log: ActivityLog): void {
  write(JSON.stringify({ version: 1, days: log.days }))
}

export function recordPractice(date: string, patch: ActivityPatch): ActivityLog {
  const next = pruneActivity(applyActivity(loadActivity(), date, patch), date)
  saveActivity(next)
  return next
}

export function snapshotMistakeCount(date: string, count: number): void {
  const safe = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0
  const current = loadActivity()
  if (current.days[date]?.mistakeCount === safe) return
  saveActivity(pruneActivity(applyActivity(current, date, { mistakeCount: safe }), date))
}
