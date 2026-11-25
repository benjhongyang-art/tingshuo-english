import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { MissingLesson, PracticeShell } from "@/components/practice-shell.tsx"
import { PlayButton } from "@/components/play-button.tsx"
import { Segmented } from "@/components/segmented.tsx"
import { WordMarks } from "@/components/word-marks.tsx"
import { getLesson, itemKey } from "@/data/lessons.ts"
import { buildChoices } from "@/lib/choices.ts"
import { choiceFeedback, dictationFeedback, roundFeedback } from "@/lib/feedback.ts"
import type { MistakeTarget } from "@/lib/mistakes.ts"
import { useProgress } from "@/lib/progress-context.tsx"
import { useReview } from "@/lib/review-context.tsx"
import { assessUtterance, type Assessment } from "@/lib/score.ts"
import { hasHeardModel, markHeardModel, useEnglishSpeech } from "@/lib/speech.ts"
import { saveLast } from "@/lib/storage.ts"
import { useRate } from "@/lib/use-rate.ts"
import type { Lesson, LessonItem, ListenMode } from "@/types.ts"

export function ListeningPractice() {
  const { lessonId } = useParams()
  const lesson = getLesson(lessonId)
  const [seenLesson, setSeenLesson] = useState(lessonId)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [session, setSession] = useState({ correct: 0, total: 0 })
  const [mode, setMode] = useState<ListenMode>("choice")
  const [rate, setRate] = useRate()

  if (lessonId !== seenLesson) {
    setSeenLesson(lessonId)
    setIndex(0)
    setDone(false)
    setSession({ correct: 0, total: 0 })
  }

  useEffect(() => {
    if (!lesson) return
    document.title = `聽力 · ${lesson.title} — 聽說`
    saveLast({ lessonId: lesson.id, mode: "listen" })
  }, [lesson])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index, done])

  if (!lesson) return <MissingLesson />

  const item = lesson.items[index] ?? lesson.items[0]
  if (!item) return <MissingLesson />

  return (
    <PracticeShell title={`${lesson.title} · 聽力`} step={done ? lesson.items.length : index + 1} total={lesson.items.length}>
      {done ? (
        <RoundSummary
          correct={session.correct}
          total={session.total}
          lesson={lesson}
          onAgain={() => {
            setIndex(0)
            setDone(false)
            setSession({ correct: 0, total: 0 })
          }}
        />
      ) : (
        <ListenQuestion
          key={`${lesson.id}:${item.id}`}
          item={item}
          progressKey={itemKey(lesson.id, item.id)}
          pool={lesson.items.map((entry) => entry.en)}
          seed={`${lesson.id}:${item.id}`}
          track={{
            kind: "lesson",
            topicId: lesson.id,
            refId: item.id,
            en: item.en,
            zh: item.zh,
            ipa: item.ipa,
          }}
          mode={mode}
          onMode={setMode}
          rate={rate}
          onRate={setRate}
          isLast={index + 1 >= lesson.items.length}
          onAnswered={(correct) =>
            setSession((current) => ({
              correct: current.correct + (correct ? 1 : 0),
              total: current.total + 1,
            }))
          }
          onNext={() => {
            if (index + 1 >= lesson.items.length) setDone(true)
            else setIndex((current) => current + 1)
          }}
        />
      )}
    </PracticeShell>
  )
}

export function ListenQuestion({
  item,
  progressKey,
  pool,
  seed,
  track,
  mode,
  onMode,
  rate,
  onRate,
  isLast,
  onAnswered,
  onNext,
  recordProgress = true,
}: {
  item: LessonItem
  progressKey: string
  pool: string[]
  seed: string
  track: MistakeTarget
  mode: ListenMode
  onMode: (mode: ListenMode) => void
  rate: "slow" | "normal"
  onRate: (rate: "slow" | "normal") => void
  isLast: boolean
  onAnswered: (correct: boolean) => void
  onNext: () => void
  recordProgress?: boolean
}) {
  const { recordListen } = useProgress()
  const { noteListen } = useReview()
  const { speak, stop, speaking, supported, problem } = useEnglishSpeech()
  const locked = useRef(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState("")
  const [draftError, setDraftError] = useState("")
  const [phase, setPhase] = useState<"answer" | "reveal">("answer")
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [seenMode, setSeenMode] = useState(mode)
  if (mode !== seenMode) {
    setSeenMode(mode)
    setTyped("")
    setDraftError("")
  }
  const choices = useMemo(() => buildChoices(item.en, pool, seed), [item.en, pool, seed])

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
    speak(item.en, rate)
  }

  function finish(correct: boolean, nextAssessment: Assessment | null) {
    if (locked.current) return
    locked.current = true
    setAssessment(nextAssessment)
    setPhase("reveal")
    if (recordProgress) recordListen(progressKey, correct)
    noteListen(track, correct)
    onAnswered(correct)
    speak(item.en, rate, "auto")
  }

  function choose(option: string) {
    if (phase !== "answer") return
    setPicked(option)
    finish(option === item.en, null)
  }

  function submitDictation(event: FormEvent) {
    event.preventDefault()
    if (phase !== "answer") return
    const text = typed.trim()
    if (!text) {
      setDraftError("請先輸入你聽到的英文。")
      return
    }
    const result = assessUtterance(item.en, text)
    finish(result.exact, result)
  }

  const correct = mode === "choice" ? picked === item.en : Boolean(assessment?.exact)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {phase === "answer" ? (
          <Segmented
            label="作答方式"
            value={mode}
            onChange={onMode}
            options={[
              { value: "choice", label: "選擇" },
              { value: "dictation", label: "聽寫" },
            ]}
          />
        ) : (
          <span />
        )}
        <Segmented
          label="播放速度"
          value={rate}
          onChange={onRate}
          options={[
            { value: "slow", label: "慢速" },
            { value: "normal", label: "正常" },
          ]}
        />
      </div>

      {!supported ? (
        <p className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
          這個瀏覽器無法朗讀英文，聽力練習沒辦法播放。請改用 Chrome 或 Edge。
        </p>
      ) : phase === "answer" ? (
        <>
          <div className="mt-8 flex flex-col items-center">
            <PlayButton speaking={speaking} onClick={play} />
            <p className="mt-4 text-center text-sm text-muted-foreground">聽完再作答。可以重複播放。</p>
            {problem && <p className="mt-2 text-center text-sm text-speak">{problem}</p>}
          </div>
          {mode === "choice" ? (
            <div className="mt-6 grid gap-2">
              {choices.map((option, optionIndex) => (
                <Button
                  key={option}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-12 w-full justify-start gap-3 bg-card px-3 py-3 text-left text-base whitespace-normal"
                  onClick={() => choose(option)}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span lang="en">{option}</span>
                </Button>
              ))}
            </div>
          ) : (
            <form className="mt-6" onSubmit={submitDictation}>
              <label className="mb-2 block text-sm font-medium" htmlFor="dictation">
                輸入你聽到的英文
              </label>
              <Input
                id="dictation"
                lang="en"
                value={typed}
                onChange={(event) => {
                  setTyped(event.target.value)
                  setDraftError("")
                }}
                placeholder="在這裡打上你聽到的英文"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                className="h-12 bg-card px-3 text-base md:text-base"
              />
              {draftError && (
                <p className="mt-2 text-sm text-speak" role="alert">
                  {draftError}
                </p>
              )}
              <Button type="submit" className="mt-3 h-12 w-full text-base">
                檢查
              </Button>
            </form>
          )}
        </>
      ) : (
        <section aria-live="polite" className="mt-6 rounded-[1.75rem] border bg-card p-5 shadow-sm">
          <p className={correct ? "text-sm font-semibold text-good" : "text-sm font-semibold text-speak"}>
            {mode === "choice" ? choiceFeedback(correct) : assessment ? dictationFeedback(assessment) : ""}
          </p>
          <p lang="en" className="mt-3 font-display text-[2rem] leading-tight text-balance">
            {item.en}
          </p>
          <p lang="en" className="mt-2 font-display text-sm tracking-wide text-muted-foreground">
            {item.ipa}
          </p>
          <p className="mt-3 text-lg">{item.zh}</p>
          {mode === "dictation" && assessment && !assessment.exact && (
            <div className="mt-4 rounded-2xl bg-muted px-3 py-3">
              <p className="text-xs font-medium text-muted-foreground">你寫的是</p>
              <p lang="en" className="mt-1 text-base">
                <WordMarks marks={assessment.spokenMarks} />
              </p>
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={play}>
              再聽一次
            </Button>
            <Button type="button" className="h-12 text-base" onClick={onNext}>
              {isLast ? "看結果" : "下一題"}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function RoundSummary({
  correct,
  total,
  lesson,
  onAgain,
}: {
  correct: number
  total: number
  lesson: Lesson
  onAgain: () => void
}) {
  const navigate = useNavigate()
  const ratio = total === 0 ? 0 : correct / total
  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <p className="text-sm font-semibold tracking-[0.14em] text-primary">這一輪</p>
      <h2 className="mt-2 font-display text-4xl">聽力練完了</h2>
      <p className="mt-3 text-muted-foreground">{roundFeedback(ratio)}</p>
      <p className="mt-6 font-display text-5xl">
        {correct}
        <span className="text-2xl text-muted-foreground"> / {total}</span>
      </p>
      <p className="text-sm text-muted-foreground">答對題數</p>
      <div className="mt-8 grid gap-2">
        <Button type="button" className="h-12 text-base" onClick={onAgain}>
          再練一輪
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 bg-card text-base"
          onClick={() => navigate(`/speak/${lesson.id}`)}
        >
          換成發音練習
        </Button>
      </div>
    </div>
  )
}
