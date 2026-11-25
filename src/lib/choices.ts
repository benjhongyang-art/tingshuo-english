function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const current = next[index]!
    next[index] = next[swap]!
    next[swap] = current
  }
  return next
}

export function buildChoices(correct: string, pool: string[], seed: string): string[] {
  const unique: string[] = []
  for (const item of pool) {
    if (item !== correct && !unique.includes(item)) unique.push(item)
  }
  const random = mulberry32(hashString(seed))
  const distractors = shuffle(unique, random).slice(0, 3)
  return shuffle([correct, ...distractors], random)
}
