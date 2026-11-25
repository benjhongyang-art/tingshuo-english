import { emptyReadingStats, parseReadingStats, READING_KEY, type ReadingStats } from "./reading.ts"

function read(): string | null {
  try {
    if (typeof localStorage === "undefined") return null
    return localStorage.getItem(READING_KEY)
  } catch {
    return null
  }
}

function write(value: string): void {
  try {
    localStorage.setItem(READING_KEY, value)
  } catch {
    // A failed write should not block the quiz.
  }
}

export function loadReadingStats(): ReadingStats {
  const raw = read()
  if (!raw) return emptyReadingStats()
  try {
    return parseReadingStats(JSON.parse(raw))
  } catch {
    return emptyReadingStats()
  }
}

export function saveReadingStats(stats: ReadingStats): void {
  write(JSON.stringify({ version: 1, passages: stats.passages }))
}
