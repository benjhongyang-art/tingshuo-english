import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { getVocabCard, vocabIds } from "../data/vocabulary.ts"
import {
  mistakeCount,
  recordCardOutcome,
  recordListenOutcome,
  recordSpeakOutcome,
  removeMistake,
  type MistakeBook,
  type MistakeTarget,
} from "./mistakes.ts"
import { calendarDay } from "./progress.ts"
import { useProgress } from "./progress-context.tsx"
import { loadMistakes, loadSchedules, saveMistakes, saveSchedules } from "./storage.ts"
import { applyReview, newSchedule, summarizeDue, type CardSchedule, type DueSummary, type ReviewRating } from "./srs.ts"

type ReviewApi = {
  today: string
  schedules: Record<string, CardSchedule>
  due: DueSummary
  mistakes: MistakeBook
  mistakeCount: number
  reviewCard: (cardId: string, rating: ReviewRating) => void
  noteListen: (target: MistakeTarget, correct: boolean) => void
  noteSpeak: (target: MistakeTarget, score: number) => void
  dismissMistake: (id: string) => void
}

const ReviewContext = createContext<ReviewApi | null>(null)

export function ReviewProvider({ children }: { children: ReactNode }) {
  const { markToday } = useProgress()
  const [schedules, setSchedules] = useState<Record<string, CardSchedule>>(() => loadSchedules())
  const [mistakes, setMistakes] = useState<MistakeBook>(() => loadMistakes())
  const [today] = useState(() => calendarDay(new Date()))

  const changeBook = useCallback((change: (prev: MistakeBook) => MistakeBook) => {
    setMistakes((prev) => {
      const next = change(prev)
      if (next === prev) return prev
      saveMistakes(next)
      return next
    })
  }, [])

  const reviewCard = useCallback((cardId: string, rating: ReviewRating) => {
    const card = getVocabCard(cardId)
    if (!card) return
    const day = calendarDay(new Date())
    setSchedules((prev) => {
      const current = prev[cardId] ?? newSchedule(day)
      const next = { ...prev, [cardId]: applyReview(current, rating, day) }
      saveSchedules(next)
      return next
    })
    changeBook((prev) => {
      return recordCardOutcome(
        prev,
        {
          kind: "card",
          topicId: card.topicId,
          refId: card.id,
          en: card.word,
          zh: card.zh,
          ipa: card.ipa,
          note: card.example,
        },
        rating,
        day,
      ).book
    })
    markToday()
  }, [changeBook, markToday])

  const noteListen = useCallback(
    (target: MistakeTarget, correct: boolean) => {
      const day = calendarDay(new Date())
      changeBook((prev) => recordListenOutcome(prev, target, correct, day).book)
      markToday()
    },
    [changeBook, markToday],
  )

  const noteSpeak = useCallback(
    (target: MistakeTarget, score: number) => {
      const day = calendarDay(new Date())
      changeBook((prev) => recordSpeakOutcome(prev, target, score, day).book)
      markToday()
    },
    [changeBook, markToday],
  )

  const dismissMistake = useCallback(
    (id: string) => {
      changeBook((prev) => removeMistake(prev, id))
    },
    [changeBook],
  )

  const api = useMemo<ReviewApi>(() => {
    return {
      today,
      schedules,
      due: summarizeDue(schedules, vocabIds(), today),
      mistakes,
      mistakeCount: mistakeCount(mistakes),
      reviewCard,
      noteListen,
      noteSpeak,
      dismissMistake,
    }
  }, [dismissMistake, mistakes, noteListen, noteSpeak, reviewCard, schedules, today])

  return <ReviewContext.Provider value={api}>{children}</ReviewContext.Provider>
}

export function useReview(): ReviewApi {
  const api = useContext(ReviewContext)
  if (!api) throw new Error("useReview 必須放在 ReviewProvider 裡")
  return api
}
