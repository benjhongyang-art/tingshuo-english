import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Mic } from "lucide-react"
import { Button } from "@/components/ui/button.tsx"
import { MissingLesson, PracticeShell } from "@/components/practice-shell.tsx"
import { Segmented } from "@/components/segmented.tsx"
import { WordMarks } from "@/components/word-marks.tsx"
import { getLesson, itemKey } from "@/data/lessons.ts"
import { speakFeedback, speakRoundFeedback } from "@/lib/feedback.ts"
import { useProgress } from "@/lib/progress-context.tsx"
import { assessUtterance, type Assessment } from "@/lib/score.ts"
import {
  hasHeardModel,
  markHeardModel,
  useEnglishSpeech,
  usePronunciationRecognizer,
} from "@/lib/speech.ts"
import { saveLast } from "@/lib/storage.ts"
import { useRate } from "@/lib/use-rate.ts"
import type { Lesson, LessonItem } from "@/types.ts"
import { cn } from "cn"

export function PronunciationPractice() {
  const { lessonId } = useParams()
  const lesson = getLesson(lessonId)
  const [seenLesson, setSeenLesson] = useState(lessonId)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [scores, setScores] = useState<number[]>([])
  const [rate, setRate] = useRate()

  if (lessonId !== seenLesson) {
    setSeenLesson(lessonId)
    setIndex(0)
    setDone(false)
    setScores([])
  }

  useEffect(() => {
    if (!lesson) return
    document.title = `發音 · ${lesson.title} — 聽說`
    saveLast({ lessonId: lesson.id, mode: "speak" })
  }, [lesson])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index, done])

  if (!lesson) return <MissingLesson />
  const item = lesson.items[index] ?? lesson.items[0]
  if (!item) return <MissingLesson />

  return (
    <PracticeShell title={`${lesson.title} · 發音`} step={done ? lesson.items.length : index + 1} total={lesson.items.length}>
      {done ? (
        <SpeakSummary
          lesson={lesson}
          scores={scores}
          onAgain={() => {
            setIndex(0)
            setDone(false)
            setScores([])
          }}
        />
      ) : (
        <SpeakQuestion
          key={`${lesson.id}:${item.id}`}
          lesson={lesson}
          item={item}
          rate={rate}
          onRate={setRate}
          isLast={index + 1 >= lesson.items.length}
          onScored={(score) => setScores((current) => [...current, score])}
          onNext={() => {
            if (index + 1 >= lesson.items.length) setDone(true)
            else setIndex((current) => current + 1)
          }}
        />
      )}
    </PracticeShell>
  )
}

function SpeakQuestion({
  lesson,
  item,
  rate,
  onRate,
  isLast,
  onScored,
  onNext,
}: {
  lesson: Lesson
  item: LessonItem
  rate: "slow" | "normal"
  onRate: (rate: "slow" | "normal") => void
  isLast: boolean
  onScored: (score: number) => void
  onNext: () => void
}) {
  const { recordSpeak } = useProgress()
  const { speak, stop, speaking, supported, problem } = useEnglishSpeech()
  const rec = usePronunciationRecognizer()
  const [attempt, setAttempt] = useState<{ text: string; result: Assessment } | null>(null)

  useEffect(() => {
    if (!supported || !hasHeardModel()) return
    speak(item.en, rate, "auto")
    return () => stop()
  }, [item.en, rate, speak, stop, supported])

  function play() {
    if (speaking) {
      stop()
      return
    }
    markHeardModel()
    rec.abort()
    speak(item.en, rate)
  }

  function begin() {
    stop()
    if (rec.listening) {
      rec.stop()
      return
    }
    setAttempt(null)
    rec.start((text) => {
      const result = assessUtterance(item.en, text)
      setAttempt({ text, result })
      recordSpeak(itemKey(lesson.id, item.id), result.score)
      onScored(result.score)
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end">
        <Segmented
          label="示範速度"
          value={rate}
          onChange={onRate}
          options={[
            { value: "slow", label: "慢速" },
            { value: "normal", label: "正常" },
          ]}
        />
      </div>

      <div className="mt-6 text-center">
        <h1 lang="en" className="font-display text-[1.85rem] leading-tight text-balance sm:text-4xl">
          {attempt ? <WordMarks marks={attempt.result.targetMarks} /> : item.en}
        </h1>
        <p lang="en" className="mt-2 font-display text-sm tracking-wide text-muted-foreground">
          {item.ipa}
        </p>
        <p className="mt-3 text-lg">{item.zh}</p>
        {supported ? (
          <Button type="button" variant="outline" className="mt-4 h-11 bg-card px-4 text-base" onClick={play}>
            {speaking ? "播放中" : "聽示範發音"}
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">這個瀏覽器無法朗讀示範。</p>
        )}
        {problem && <p className="mt-2 text-sm text-speak">{problem}</p>}
      </div>

      {rec.supported ? (
        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={begin}
            aria-pressed={rec.listening}
            aria-label={rec.listening ? "停止錄音" : "開始說英文"}
            className={cn(
              "flex size-28 items-center justify-center rounded-full bg-speak text-white shadow-[0_18px_40px_-18px] shadow-speak transition-transform active:scale-95",
              rec.listening && "mic-live",
            )}
          >
            <Mic className="size-10" strokeWidth={1.75} />
          </button>
          <p className="mt-3 text-center text-sm text-muted-foreground">
            {rec.listening ? "正在聆聽…請說出這句話" : "按一下麥克風，用英文說一次"}
          </p>
          {rec.listening && rec.transcript && (
            <p lang="en" className="mt-2 text-center text-base" aria-live="polite">
              {rec.transcript}
            </p>
          )}
        </div>
      ) : (
        <p
          className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          role="status"
        >
          這個瀏覽器不支援語音辨識，沒辦法幫你評分。請改用電腦或手機上的 Chrome 或 Edge，並允許麥克風。你仍然可以聽示範發音，自己跟著說。
        </p>
      )}

      {rec.error && !attempt && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800" role="alert">
          {rec.error}
        </p>
      )}

      {attempt && (
        <section aria-live="polite" className="mt-6 rounded-[1.75rem] border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <ScoreRing score={attempt.result.score} />
            <div>
              <p className="text-sm text-muted-foreground">相似度</p>
              <p className="font-display text-3xl leading-none">{attempt.result.score}</p>
              <p className="mt-2 text-sm leading-6">{speakFeedback(attempt.result)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">底色標出的字和目標不一樣。</p>
          <p lang="en" className="mt-3 text-sm text-muted-foreground">
            辨識成：{attempt.text}
          </p>
          {!attempt.result.exact && attempt.result.spokenMarks.some((mark) => mark.status === "miss") && (
            <p lang="en" className="mt-2 text-base">
              <WordMarks marks={attempt.result.spokenMarks} />
            </p>
          )}
          <Button type="button" variant="outline" className="mt-4 h-12 w-full bg-card text-base" onClick={begin}>
            再試一次
          </Button>
        </section>
      )}

      <Button type="button" variant="ghost" className="mt-4 h-11 text-base" onClick={onNext}>
        {isLast ? "看這輪結果" : attempt ? "下一句" : "先練下一句"}
      </Button>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "var(--good)" : score >= 50 ? "oklch(0.72 0.13 78)" : "var(--speak)"
  return (
    <div
      className="grid size-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, var(--muted) 0deg)` }}
      aria-hidden
    >
      <div className="grid size-[3.4rem] place-items-center rounded-full bg-card font-display text-xl">{score}</div>
    </div>
  )
}

function SpeakSummary({
  lesson,
  scores,
  onAgain,
}: {
  lesson: Lesson
  scores: number[]
  onAgain: () => void
}) {
  const navigate = useNavigate()
  const average = scores.length === 0 ? null : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <p className="text-sm font-semibold tracking-[0.14em] text-speak">這一輪</p>
      <h2 className="mt-2 font-display text-4xl">發音練完了</h2>
      <p className="mt-3 text-muted-foreground">{speakRoundFeedback(average)}</p>
      <p className="mt-6 font-display text-5xl">{average === null ? "—" : average}</p>
      <p className="text-sm text-muted-foreground">
        {scores.length === 0 ? "這輪還沒有評分" : `${scores.length} 次發音的平均分`}
      </p>
      <div className="mt-8 grid gap-2">
        <Button type="button" className="h-12 bg-speak text-base text-white hover:bg-speak/90" onClick={onAgain}>
          再練一輪
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 bg-card text-base"
          onClick={() => navigate(`/listen/${lesson.id}`)}
        >
          換成聽力練習
        </Button>
      </div>
    </div>
  )
}
