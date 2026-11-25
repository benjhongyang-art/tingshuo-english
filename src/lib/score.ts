export type WordMark = {
  text: string
  status: "match" | "miss"
}

export type Assessment = {
  score: number
  exact: boolean
  targetMarks: WordMark[]
  spokenMarks: WordMark[]
}

const CONTRACTIONS: Record<string, string[]> = {
  "i'm": ["i", "am"],
  "i'd": ["i", "would"],
  "i'll": ["i", "will"],
  "i've": ["i", "have"],
  "you're": ["you", "are"],
  "you'd": ["you", "would"],
  "you'll": ["you", "will"],
  "you've": ["you", "have"],
  "we're": ["we", "are"],
  "we'd": ["we", "would"],
  "we'll": ["we", "will"],
  "we've": ["we", "have"],
  "they're": ["they", "are"],
  "they'd": ["they", "would"],
  "they'll": ["they", "will"],
  "they've": ["they", "have"],
  "it's": ["it", "is"],
  "it'll": ["it", "will"],
  "that's": ["that", "is"],
  "what's": ["what", "is"],
  "let's": ["let", "us"],
  "don't": ["do", "not"],
  "doesn't": ["does", "not"],
  "didn't": ["did", "not"],
  "can't": ["can", "not"],
  cannot: ["can", "not"],
  "won't": ["will", "not"],
  "isn't": ["is", "not"],
  "aren't": ["are", "not"],
  "there's": ["there", "is"],
  "he's": ["he", "is"],
  "she's": ["she", "is"],
}

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
}

const FILLERS = new Set(["uh", "um", "er", "ah", "hmm", "hm"])

const TOKEN = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g

type Unit = {
  displayIndex: number
  part: string
}

function displayTokens(text: string): string[] {
  return text.match(TOKEN) ?? []
}

function normalizeKey(token: string): string {
  return token.toLowerCase().replace(/[’‘]/g, "'")
}

function expandToken(token: string): string[] {
  const key = normalizeKey(token)
  const contraction = CONTRACTIONS[key]
  if (contraction) return contraction
  const stripped = key.replace(/'/g, "")
  if (!stripped || FILLERS.has(stripped)) return []
  return [NUMBER_WORDS[stripped] ?? stripped]
}

function unitsFor(tokens: string[]): Unit[] {
  const units: Unit[] = []
  tokens.forEach((token, displayIndex) => {
    for (const part of expandToken(token)) {
      units.push({ displayIndex, part })
    }
  })
  return units
}

function align(target: string[], spoken: string[]): { targetMatch: boolean[]; spokenMatch: boolean[] } {
  const n = target.length
  const m = spoken.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] = target[i] === spoken[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }

  const targetMatch = Array<boolean>(n).fill(false)
  const spokenMatch = Array<boolean>(m).fill(false)
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (target[i] === spoken[j]) {
      targetMatch[i] = true
      spokenMatch[j] = true
      i += 1
      j += 1
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      i += 1
    } else {
      j += 1
    }
  }
  return { targetMatch, spokenMatch }
}

function marksFor(tokens: string[], units: Unit[], matched: boolean[]): WordMark[] {
  return tokens.map((text, displayIndex) => {
    const indexes = units.flatMap((unit, index) => (unit.displayIndex === displayIndex ? [index] : []))
    const ok = indexes.length > 0 && indexes.every((index) => matched[index])
    return { text, status: ok ? "match" : "miss" }
  })
}

export function assessUtterance(target: string, spoken: string): Assessment {
  const targetTokens = displayTokens(target)
  const spokenTokens = displayTokens(spoken).filter((token) => expandToken(token).length > 0)
  const targetUnits = unitsFor(targetTokens)
  const spokenUnits = unitsFor(spokenTokens)
  const { targetMatch, spokenMatch } = align(
    targetUnits.map((unit) => unit.part),
    spokenUnits.map((unit) => unit.part),
  )
  const matched = targetMatch.filter(Boolean).length
  const score = targetUnits.length === 0 ? 0 : Math.round((matched / targetUnits.length) * 100)
  const targetMarks = marksFor(targetTokens, targetUnits, targetMatch)
  const spokenMarks = marksFor(spokenTokens, spokenUnits, spokenMatch)
  const exact =
    targetUnits.length > 0 &&
    matched === targetUnits.length &&
    spokenMatch.length === spokenUnits.length &&
    spokenMatch.every(Boolean)

  return { score, exact, targetMarks, spokenMarks }
}
