import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Volume2 } from "lucide-react"
import { BackHeader } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Segmented } from "@/components/segmented.tsx"
import { lessons } from "@/data/lessons.ts"
import { topicTitle, vocabulary, type VocabCard } from "@/data/vocabulary.ts"
import { useReview } from "@/lib/review-context.tsx"
import { useEnglishSpeech } from "@/lib/speech.ts"
import { applyReview, dueCards, intervalLabel, newSchedule, nextDueDay, type ReviewRating } from "@/lib/srs.ts"
import { useRate } from "@/lib/use-rate.ts"
import { cn } from "cn"

const RATINGS: { rating: ReviewRating; label: string }[] = [
  { rating: "again", label: "忘記" },
  { rating: "hard", label: "模糊" },
  { rating: "good", label: "記得" },
]

export function Flashcards() {
  const navigate = useNavigate()
  const { schedules, due, reviewCard, today } = useReview()
  const [topicId, setTopicId] = useState("all")
  const [tally, setTally] = useState({ again: 0, hard: 0, good: 0 })
  const [rate, setRate] = useRate()
  const reviewed = tally.again + tally.hard + tally.good

  const queue = useMemo(() => {
    const cards = topicId === "all" ? vocabulary : vocabulary.filter((card) => card.topicId === topicId)
    return dueCards(cards, schedules, today)
  }, [schedules, today, topicId])

  useEffect(() => {
    document.title = "單字閃卡 — 聽說"
  }, [])

  function selectTopic(next: string) {
    setTopicId(next)
    setTally({ again: 0, hard: 0, good: 0 })
  }

  const current = queue[0]
  const total = reviewed + queue.length
  const upcoming = nextDueDay(schedules, vocabulary.map((card) => card.id), today)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <BackHeader
        title="單字閃卡"
        detail={current ? `${reviewed + 1} / ${total}` : reviewed > 0 ? `複習了 ${reviewed} 張` : `今日待複習 ${due.due} 張`}
      />

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="主題">
        <TopicChip selected={topicId === "all"} onClick={() => selectTopic("all")}>
          全部
        </TopicChip>
        {lessons.map((lesson) => (
          <TopicChip key={lesson.id} selected={topicId === lesson.id} onClick={() => selectTopic(lesson.id)}>
            {lesson.title}
          </TopicChip>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Segmented
          label="播放速度"
          value={rate}
          onChange={setRate}
          options={[
            { value: "slow", label: "慢速" },
            { value: "normal", label: "正常" },
          ]}
        />
      </div>

      {current ? (
        <FlashcardSlide
          key={current.id}
          card={current}
          rate={rate}
          schedule={schedules[current.id] ?? newSchedule(today)}
          today={today}
          onRate={(rating) => {
            reviewCard(current.id, rating)
            setTally((prev) => ({ ...prev, [rating]: prev[rating] + 1 }))
          }}
        />
      ) : reviewed > 0 ? (
        <section className="flex flex-1 flex-col justify-center py-8">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary">這一輪</p>
          <h2 className="mt-2 font-display text-4xl">單字排好了</h2>
          <p className="mt-3 text-muted-foreground">
            記得 {tally.good} 張，模糊 {tally.hard} 張，忘記 {tally.again} 張。忘記的會進錯題本，明天再出現。
          </p>
          {due.due > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">其他主題還有 {due.due} 張今天要看。</p>
          )}
          <div className="mt-8 grid gap-2">
            {due.due > 0 && (
              <Button type="button" className="h-12 text-base" onClick={() => selectTopic("all")}>
                繼續其他主題
              </Button>
            )}
            <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={() => navigate("/")}>
              回到首頁
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-1 flex-col justify-center py-10">
          <h2 className="font-display text-4xl">今天沒有待複習的單字</h2>
          <p className="mt-3 text-muted-foreground">
            {upcoming ? `下一張會在 ${upcoming} 出現。` : "這個主題還沒有單字。"}
          </p>
          <Button type="button" className="mt-8 h-12 w-fit px-5 text-base" onClick={() => navigate("/")}>
            回到首頁
          </Button>
        </section>
      )}
    </div>
  )
}

function FlashcardSlide({
  card,
  rate,
  schedule,
  today,
  onRate,
}: {
  card: VocabCard
  rate: "slow" | "normal"
  schedule: ReturnType<typeof newSchedule>
  today: string
  onRate: (rating: ReviewRating) => void
}) {
  const { speak, stop, speaking, supported, problem } = useEnglishSpeech()
  const [flipped, setFlipped] = useState(false)
  const lock = useRef(false)
  const previews = {
    again: applyReview(schedule, "again", today),
    hard: applyReview(schedule, "hard", today),
    good: applyReview(schedule, "good", today),
  }
  const showIntervals = new Set(RATINGS.map((option) => previews[option.rating].interval)).size > 1

  useEffect(() => {
    window.scrollTo(0, 0)
    return () => stop()
  }, [stop])

  function play(text: string) {
    if (speaking) {
      stop()
      return
    }
    speak(text, rate)
  }

  function choose(rating: ReviewRating) {
    if (lock.current) return
    lock.current = true
    stop()
    onRate(rating)
  }

  return (
    <div className="mt-4 flex flex-1 flex-col">
      <button
        type="button"
        className="card-scene block h-80 w-full bg-transparent p-0 text-left"
        aria-expanded={flipped}
        aria-label={flipped ? `${card.word}，翻回正面` : `${card.word}，翻面看意思`}
        onClick={() => setFlipped((value) => !value)}
      >
        <span className={cn("card-inner block", flipped && "is-flipped")}>
          <span className="card-face flex flex-col items-center justify-center rounded-[1.75rem] border bg-card px-6 text-center shadow-sm">
            <span className="text-xs font-semibold tracking-[0.14em] text-primary">{topicTitle(card.topicId)}</span>
            <span lang="en" className="mt-4 font-display text-5xl leading-tight">
              {card.word}
            </span>
            <span className="mt-4 text-sm text-muted-foreground">點一下看中文</span>
          </span>
          <span className="card-face card-back flex flex-col items-center justify-center rounded-[1.75rem] border bg-card px-6 text-center shadow-sm">
            <span className="text-xs font-semibold tracking-[0.14em] text-primary">{topicTitle(card.topicId)}</span>
            <span className="mt-3 font-display text-4xl leading-tight">{card.zh}</span>
            <span lang="en" className="mt-2 font-display text-sm tracking-wide text-muted-foreground">
              {card.ipa}
            </span>
            <span lang="en" className="mt-4 text-lg leading-7 text-balance">
              {card.example}
            </span>
          </span>
        </span>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 bg-card text-base"
          disabled={!supported}
          onClick={() => play(card.word)}
        >
          <Volume2 />
          {speaking ? "播放中" : "聽單字"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 bg-card text-base"
          disabled={!supported || !flipped}
          onClick={() => play(card.example)}
        >
          <Volume2 />
          聽例句
        </Button>
      </div>
      {problem && <p className="mt-2 text-center text-sm text-speak">{problem}</p>}
      {!supported && <p className="mt-2 text-center text-sm text-muted-foreground">這個瀏覽器無法朗讀英文。</p>}

      {flipped ? (
        <div className="mt-4 grid grid-cols-3 gap-2" aria-label="自評">
          {RATINGS.map((option) => (
            <Button
              key={option.rating}
              type="button"
              variant={option.rating === "good" ? "default" : "outline"}
              className={cn(
                "flex-col gap-0 whitespace-normal bg-card text-base",
                showIntervals ? "h-16" : "h-12",
                option.rating === "again" && "text-speak",
                option.rating === "good" && "bg-primary text-primary-foreground",
              )}
              onClick={() => choose(option.rating)}
            >
              {option.label}
              {showIntervals && (
                <span
                  className={cn(
                    "text-xs font-normal",
                    option.rating === "good" ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {intervalLabel(previews[option.rating].interval)}
                </span>
              )}
            </Button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-muted-foreground">先回想中文意思，翻面後再評 忘記、模糊或記得。</p>
      )}
      {flipped && !showIntervals && (
        <p className="mt-3 text-center text-xs text-muted-foreground">第一次都會在明天再出現。連續記得之後，間隔會拉長。</p>
      )}
    </div>
  )
}

function TopicChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3 text-sm font-medium",
        selected ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  )
}
