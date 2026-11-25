import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button.tsx"
import { ListenQuestion } from "@/components/listening-practice.tsx"
import { PracticeShell } from "@/components/practice-shell.tsx"
import { SpeakQuestion } from "@/components/pronunciation-practice.tsx"
import { getLesson, itemKey } from "@/data/lessons.ts"
import { vocabulary } from "@/data/vocabulary.ts"
import { roundFeedback, speakRoundFeedback } from "@/lib/feedback.ts"
import { listMistakes, type MistakeEntry, type MistakeSource, type MistakeTarget } from "@/lib/mistakes.ts"
import { useReview } from "@/lib/review-context.tsx"
import { useRate } from "@/lib/use-rate.ts"
import type { LessonItem, ListenMode } from "@/types.ts"

type Slide = {
  progressKey: string
  pool: string[]
  item: LessonItem
  track: MistakeTarget
}

function readSource(value: string | null): MistakeSource | "all" {
  if (value === "listen" || value === "speak" || value === "card") return value
  return "all"
}

function slideFrom(entry: MistakeEntry): Slide {
  const lesson = getLesson(entry.topicId)
  const pool =
    entry.kind === "card"
      ? vocabulary.filter((card) => card.topicId === entry.topicId).map((card) => card.word)
      : (lesson?.items.map((item) => item.en) ?? [entry.en])
  return {
    progressKey: entry.kind === "lesson" ? itemKey(entry.topicId, entry.refId) : `card:${entry.refId}`,
    pool: pool.includes(entry.en) ? pool : [entry.en, ...pool],
    item: {
      id: entry.refId,
      en: entry.en,
      zh: entry.note ? `${entry.zh}　例句：${entry.note}` : entry.zh,
      ipa: entry.ipa,
    },
    track: {
      kind: entry.kind,
      topicId: entry.topicId,
      refId: entry.refId,
      en: entry.en,
      zh: entry.zh,
      ipa: entry.ipa,
      note: entry.note,
    },
  }
}

export function MistakePractice() {
  const { mode } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { mistakes } = useReview()
  const practiceMode = mode === "speak" ? "speak" : mode === "listen" ? "listen" : null
  const [slides] = useState<Slide[]>(() =>
    listMistakes(mistakes, {
      source: readSource(params.get("source")),
      topicId: params.get("topic") ?? "all",
      id: params.get("id") ?? undefined,
    }).map(slideFrom),
  )
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const [listenMode, setListenMode] = useState<ListenMode>("choice")
  const [rate, setRate] = useRate()
  const backQuery = new URLSearchParams()
  if (params.get("source")) backQuery.set("source", params.get("source") ?? "")
  if (params.get("topic")) backQuery.set("topic", params.get("topic") ?? "")
  const backSearch = backQuery.toString()
  const backTo = backSearch ? `/mistakes?${backSearch}` : "/mistakes"

  useEffect(() => {
    document.title = practiceMode === "speak" ? "錯題複習 · 發音 — 聽說" : "錯題複習 · 聽力 — 聽說"
  }, [practiceMode])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index, done])

  if (!practiceMode) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
        <h1 className="font-display text-4xl">找不到這個複習</h1>
        <Button type="button" className="mt-6 h-12 w-fit px-5 text-base" onClick={() => navigate("/mistakes")}>
          回到錯題本
        </Button>
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
        <h1 className="font-display text-4xl">沒有可複習的錯題</h1>
        <p className="mt-3 text-muted-foreground">這份清單是空的。回到錯題本再挑一則。</p>
        <Button type="button" className="mt-6 h-12 w-fit px-5 text-base" onClick={() => navigate(backTo)}>
          回到錯題本
        </Button>
      </div>
    )
  }

  const slide = slides[index] ?? slides[0]
  if (!slide) return null
  const title = practiceMode === "listen" ? "錯題複習 · 聽力" : "錯題複習 · 發音"

  return (
    <PracticeShell
      title={title}
      step={done ? slides.length : index + 1}
      total={slides.length}
      backTo={backTo}
      backLabel="回到錯題本"
    >
      {done ? (
        <ReviewSummary
          mode={practiceMode}
          correct={correct}
          total={practiceMode === "listen" ? slides.length : scores.length}
          scores={scores}
          backTo={backTo}
          onAgain={() => {
            setIndex(0)
            setDone(false)
            setCorrect(0)
            setScores([])
          }}
          onSwitch={() => {
            const search = params.toString()
            const nextMode = practiceMode === "listen" ? "speak" : "listen"
            navigate(`/mistakes/practice/${nextMode}${search ? `?${search}` : ""}`)
          }}
        />
      ) : practiceMode === "listen" ? (
        <ListenQuestion
          key={slide.track.kind + slide.track.refId}
          item={slide.item}
          progressKey={slide.progressKey}
          pool={slide.pool}
          seed={slide.progressKey}
          track={slide.track}
          mode={listenMode}
          onMode={setListenMode}
          rate={rate}
          onRate={setRate}
          isLast={index + 1 >= slides.length}
          recordProgress={slide.track.kind === "lesson"}
          onAnswered={(ok) => setCorrect((count) => count + (ok ? 1 : 0))}
          onNext={() => {
            if (index + 1 >= slides.length) setDone(true)
            else setIndex((current) => current + 1)
          }}
        />
      ) : (
        <SpeakQuestion
          key={slide.track.kind + slide.track.refId}
          item={slide.item}
          progressKey={slide.progressKey}
          track={slide.track}
          rate={rate}
          onRate={setRate}
          isLast={index + 1 >= slides.length}
          recordProgress={slide.track.kind === "lesson"}
          onScored={(score) => setScores((current) => [...current, score])}
          onNext={() => {
            if (index + 1 >= slides.length) setDone(true)
            else setIndex((current) => current + 1)
          }}
        />
      )}
    </PracticeShell>
  )
}

function ReviewSummary({
  mode,
  correct,
  total,
  scores,
  backTo,
  onAgain,
  onSwitch,
}: {
  mode: "listen" | "speak"
  correct: number
  total: number
  scores: number[]
  backTo: string
  onAgain: () => void
  onSwitch: () => void
}) {
  const navigate = useNavigate()
  const average = scores.length === 0 ? null : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const ratio = total === 0 ? 0 : correct / total
  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <p className="text-sm font-semibold tracking-[0.14em] text-primary">這一輪</p>
      <h2 className="mt-2 font-display text-4xl">{mode === "listen" ? "錯題聽完了" : "錯題說完了"}</h2>
      <p className="mt-3 text-muted-foreground">{mode === "listen" ? roundFeedback(ratio) : speakRoundFeedback(average)}</p>
      <p className="mt-6 font-display text-5xl">
        {mode === "listen" ? correct : average === null ? "—" : average}
        {mode === "listen" && <span className="text-2xl text-muted-foreground"> / {total}</span>}
      </p>
      <p className="text-sm text-muted-foreground">{mode === "listen" ? "答對題數" : "發音平均分"}</p>
      <div className="mt-8 grid gap-2">
        <Button type="button" className="h-12 text-base" onClick={onAgain}>
          再練一輪
        </Button>
        <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={onSwitch}>
          {mode === "listen" ? "換成發音複習" : "換成聽力複習"}
        </Button>
        <Button type="button" variant="ghost" className="h-12 text-base" onClick={() => navigate(backTo)}>
          回到錯題本
        </Button>
      </div>
    </div>
  )
}
