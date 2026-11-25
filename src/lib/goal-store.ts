import { DEFAULT_GOAL, GOAL_KEY, parseGoal, type DailyGoal } from "./goals.ts"

function read(): string | null {
  try {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(GOAL_KEY)
  } catch {
    return null
  }
}

function write(value: string): void {
  try {
    localStorage.setItem(GOAL_KEY, value)
  } catch {
    // The goal still applies until the page is closed.
  }
}

export function loadGoal(): DailyGoal {
  const raw = read()
  if (!raw) return { ...DEFAULT_GOAL }
  try {
    return parseGoal(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_GOAL }
  }
}

export function saveGoal(goal: DailyGoal): void {
  write(JSON.stringify({ version: 1, ...goal }))
}
