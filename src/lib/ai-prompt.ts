export type AiLevel = "beginner" | "intermediate" | "advanced"

export type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type HistoryTurn = {
  role: "user" | "assistant"
  text: string
}

export type TutorReply = {
  english: string
  correction: string | null
  correctionZh: string | null
  hint: string | null
}

export type Scenario = {
  id: string
  topicId: string
  title: string
  blurb: string
  situation: string
  opener: string
}

export const HISTORY_LIMIT = 12

export const LEVELS: { id: AiLevel; label: string; instruction: string }[] = [
  {
    id: "beginner",
    label: "初級",
    instruction:
      "The learner is a beginner (about A1–A2). Use very common words and short sentences. Prefer the present tense. The english reply is 1 or 2 sentences and ends with one easy question.",
  },
  {
    id: "intermediate",
    label: "中級",
    instruction:
      "The learner is intermediate (about B1). Use everyday English. The english reply is at most 3 sentences and ends with one follow-up question.",
  },
  {
    id: "advanced",
    label: "進階",
    instruction:
      "The learner is advanced (about B2). Use natural spoken English. The english reply is at most 4 sentences and ends with one follow-up question.",
  },
]

export const scenarios: Scenario[] = [
  {
    id: "food",
    topicId: "food",
    title: "點餐",
    blurb: "在餐廳向店員點餐",
    situation:
      "You are a café server. The learner is ordering a drink or a meal. Help them order, and you may ask about size, ice, or the bill.",
    opener: "Hi! What would you like to order?",
  },
  {
    id: "travel",
    topicId: "travel",
    title: "旅行",
    blurb: "問路、買票、入住",
    situation:
      "You are a helpful local. The learner is traveling and may ask for the station, a ticket, a taxi, or a hotel.",
    opener: "Hi! Where are you going today?",
  },
  {
    id: "work",
    topicId: "work",
    title: "工作閒聊",
    blurb: "和同事打招呼、約會議",
    situation:
      "You are a friendly colleague. Make small talk about meetings, deadlines, schedules, and working from home.",
    opener: "Good morning! How is work today?",
  },
  {
    id: "greetings",
    topicId: "greetings",
    title: "初次見面",
    blurb: "打招呼、自我介紹",
    situation: "You just met the learner. Greet them, ask their name, and keep the introduction going.",
    opener: "Hi! Nice to meet you. What's your name?",
  },
  {
    id: "free",
    topicId: "free",
    title: "自由聊天",
    blurb: "聊任何日常話題",
    situation: "You are a friendly tutor having a free conversation about everyday life. Follow the learner's topic.",
    opener: "Hi! What do you want to talk about today?",
  },
]

export function scenarioById(id: string | undefined): Scenario {
  return scenarios.find((item) => item.id === id) ?? scenarios[0]!
}

export function levelById(id: string | undefined): (typeof LEVELS)[number] {
  return LEVELS.find((item) => item.id === id) ?? LEVELS[0]!
}

export function isAiLevel(value: unknown): value is AiLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced"
}

export function buildSystemPrompt(scenario: Scenario, level: AiLevel, showHint: boolean): string {
  const guide = levelById(level)
  return [
    "You are a kind English conversation tutor for a Traditional Chinese speaker.",
    `Scenario: ${scenario.title}.`,
    `Situation: ${scenario.situation}`,
    guide.instruction,
    "Stay in the scenario. Reply as the other person, not with a grammar lecture.",
    "If the learner's latest English has a mistake, set correction to one better sentence they could say. If the English is already fine, set correction to null.",
    "When correction is a sentence, set correctionZh to its short Traditional Chinese meaning. When correction is null, set correctionZh to null.",
    showHint
      ? "Set hint to one short Traditional Chinese translation of your english reply."
      : "Set hint to null. Do not add a Chinese translation of the reply.",
    "Never ask for, repeat, or invent an API key.",
    'Respond with JSON only, no markdown: {"english":"...","correction":null,"correctionZh":null,"hint":null}',
  ].join("\n")
}

export function buildTutorMessages(input: {
  scenario: Scenario
  level: AiLevel
  showHint: boolean
  history: HistoryTurn[]
}): ChatMessage[] {
  const history = input.history
    .map((turn) => ({ role: turn.role, content: turn.text.trim() }))
    .filter((turn) => turn.content !== "")
    .slice(-HISTORY_LIMIT)
  return [{ role: "system", content: buildSystemPrompt(input.scenario, input.level, input.showHint) }, ...history]
}

export function parseTutorReply(raw: string): TutorReply {
  const trimmed = raw.trim()
  const extracted = extractJsonObject(trimmed)
  if (extracted) {
    const english = cleanField(pick(extracted, "english", "reply"), 800)
    if (english) {
      return {
        english,
        correction: cleanField(pick(extracted, "correction"), 400),
        correctionZh: cleanField(pick(extracted, "correctionZh", "correction_zh"), 400),
        hint: cleanField(pick(extracted, "hint"), 400),
      }
    }
  }
  return { english: cleanField(trimmed, 800) ?? "", correction: null, correctionZh: null, hint: null }
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key]
  }
  return undefined
}

function cleanField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "none") return null
  return text.slice(0, max)
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const source = fenced?.[1]?.trim() ?? text
  const start = source.indexOf("{")
  const end = source.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
