export type SpeechRate = "slow" | "normal"

export type ListenMode = "choice" | "dictation"

export type LessonTone = "amber" | "orange" | "sky" | "teal" | "rose" | "violet" | "emerald" | "cyan" | "indigo" | "lime"

export type LessonItem = {
  id: string
  en: string
  zh: string
  ipa: string
}

export type Lesson = {
  id: string
  title: string
  blurb: string
  tone: LessonTone
  items: LessonItem[]
}

export type PracticeMode = "listen" | "speak"
