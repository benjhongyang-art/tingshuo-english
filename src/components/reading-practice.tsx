import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { BookOpenText, Volume2 } from "lucide-react"
import { BackHeader } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import {
  getReading,
  levelLabel,
  levelOrder,
  readingsFor,
  type ReadingLevel,
  type ReadingPassage,
  type ReadingQuestion,
} from "@/data/readings.ts"
import { useReading } from "@/lib/reading-context.tsx"
import { gradeReading, lookupGloss, passageAccuracy, readingMistakeTarget, tokenizeSentence } from "@/lib/reading.ts"
import { useReview } from "@/lib/review-context.tsx"
import { useEnglishSpeech } from "@/lib/speech.ts"
import { useStudyTimer } from "@/lib/study-timer.ts"
import { useRate } from "@/lib/use-rate.ts"
import { cn } from "cn"

type LevelFilter = ReadingLevel | "all"

export function ReadingHome() {
  const navigate = useNavigate()
  const { stats, summary } = useReading()
  const [level, setLevel] = useState<LevelFilter>("all")

  useEffect(() => {
    document.title = "閱讀 — 聽說"
  }, [])

  const shown = readingsFor(level)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">READING</p>
        <h1 className="mt-1 font-display text-4xl leading-none">閱讀短文</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          點句子可以聽，點單字看中文。讀完回答理解問題，說明是中文。答錯會進錯題本。
          {summary.accuracy === null ? " 還沒有閱讀紀錄。" : ` 目前正確率 ${summary.accuracy}%。`}
        </p>
      </header>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="程度">
        <LevelChip selected={level === "all"} onClick={() => setLevel("all")}>
          全部
        </LevelChip>
        {levelOrder.map((item) => (
          <LevelChip key={item} selected={level === item} onClick={() => setLevel(item)}>
            {levelLabel[item]}
          </LevelChip>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {shown.map((passage) => {
          const accuracy = passageAccuracy(stats, passage.id)
          return (
            <button
              key={passage.id}
              type="button"
              onClick={() => navigate(`/read/${passage.id}`)}
              className="rounded-[1.6rem] border bg-card p-4 text-left shadow-sm"
            >
              <span className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <BookOpenText className="size-6" />
                </span>
                <span>
                  <span className="block text-xs font-medium text-primary">{levelLabel[passage.level]}</span>
                  <span className="mt-1 block text-lg font-semibold">{passage.titleZh}</span>
                  <span lang="en" className="mt-1 block text-sm text-muted-foreground">
                    {passage.title}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {passage.questions.length} 題
                    {accuracy === null ? " · 尚未作答" : ` · 正確率 ${accuracy}%`}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-6">
        <Button type="button" variant="outline" className="h-12 bg-card px-4 text-base" onClick={() => navigate("/")}>
          回到首頁
        </Button>
      </div>
    </div>
  )
}

export function ReadingSession() {
  const { passageId } = useParams()
  const navigate = useNavigate()
  const passage = getReading(passageId)
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  useStudyTimer()

  useEffect(() => {
    document.title = passage ? `閱讀 · ${passage.titleZh} — 聽說` : "閱讀 — 聽說"
  }, [passage])

  if (!passage) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
        <h1 className="font-display text-4xl">找不到這篇短文</h1>
        <p className="mt-3 text-muted-foreground">回到列表再挑一篇。</p>
        <Button type="button" className="mt-6 h-12 w-fit px-5 text-base" onClick={() => navigate("/read")}>
          回到閱讀
        </Button>
      </div>
    )
  }

  const question = passage.questions[index]
  const correctCount = results.filter(Boolean).length

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <BackHeader title={`${levelLabel[passage.level]} · ${passage.titleZh}`} detail={passage.title} to="/read" />
      <PassageView passage={passage} />
      {done || !question ? (
        <section className="mt-6">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary">這一篇</p>
          <h2 className="mt-2 font-display text-4xl">
            答對 {correctCount} / {results.length}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">答錯的句子已經放進錯題本，可以用聽力或發音再練。</p>
          <div className="mt-6 grid gap-2">
            <Button
              type="button"
              className="h-12 text-base"
              onClick={() => {
                setIndex(0)
                setResults([])
                setDone(false)
              }}
            >
              再讀一次
            </Button>
            <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={() => navigate("/read")}>
              換一篇
            </Button>
          </div>
        </section>
      ) : (
        <QuestionView
          key={question.id}
          passage={passage}
          question={question}
          step={index + 1}
          total={passage.questions.length}
          onAnswered={(correct) => setResults((prev) => [...prev, correct])}
          onNext={() => {
            if (index >= passage.questions.length - 1) setDone(true)
            else setIndex((value) => value + 1)
          }}
        />
      )}
    </div>
  )
}

function PassageView({ passage }: { passage: ReadingPassage }) {
  const { speak, stop, speaking } = useEnglishSpeech()
  const [rate, setRate] = useRate()
  const [picked, setPicked] = useState<{ word: string; zh: string | null } | null>(null)

  function hear(sentence: string) {
    if (speaking) stop()
    else speak(sentence, rate)
  }

  return (
    <section className="mt-4 rounded-[1.6rem] border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">點句子聽讀，點單字看中文。</p>
        <button
          type="button"
          className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
          onClick={() => setRate(rate === "slow" ? "normal" : "slow")}
        >
          {rate === "slow" ? "慢速" : "正常"}
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {passage.sentences.map((sentence) => (
          <div key={sentence.id}>
            <button
              type="button"
              className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
              onClick={() => hear(sentence.en)}
            >
              <Volume2 className="size-3.5" />
              聽這句
            </button>
            <p lang="en" className="text-base leading-7">
              {tokenizeSentence(sentence.en).map((token, index) =>
                token.lookup ? (
                  <button
                    key={`${sentence.id}-${index}`}
                    type="button"
                    className="rounded px-0.5 underline decoration-dotted decoration-muted-foreground/70 underline-offset-4 hover:bg-muted"
                    onClick={() => setPicked({ word: token.lookup ?? token.text, zh: lookupGloss(passage.gloss, token.lookup ?? "") })}
                  >
                    {token.text}
                  </button>
                ) : (
                  <span key={`${sentence.id}-${index}`}>{token.text}</span>
                ),
              )}
            </p>
          </div>
        ))}
      </div>
      {picked && (
        <p className="mt-4 rounded-2xl bg-muted px-3 py-3 text-sm leading-6" role="status">
          <span lang="en" className="font-semibold">
            {picked.word}
          </span>
          <span className="mt-1 block">{picked.zh ?? "這個字還沒有收錄中文。"}</span>
        </p>
      )}
    </section>
  )
}

function QuestionView({
  passage,
  question,
  step,
  total,
  onAnswered,
  onNext,
}: {
  passage: ReadingPassage
  question: ReadingQuestion
  step: number
  total: number
  onAnswered: (correct: boolean) => void
  onNext: () => void
}) {
  const { record } = useReading()
  const { noteReading } = useReview()
  const [picked, setPicked] = useState<string | null>(null)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const chosen = question.choices.find((choice) => choice.id === picked)

  function choose(choiceId: string) {
    if (correct !== null) return
    const choice = question.choices.find((item) => item.id === choiceId)
    const ok = gradeReading(question.answerId, choiceId)
    setPicked(choiceId)
    setCorrect(ok)
    record(passage.id, ok)
    noteReading(readingMistakeTarget(passage, question, choice?.text ?? ""), ok)
    onAnswered(ok)
  }

  return (
    <section className="mt-4" aria-label="理解測驗">
      <p className="text-sm font-semibold">
        理解問題 {step} / {total}
      </p>
      <h2 className="mt-2 text-lg font-semibold leading-7">{question.prompt}</h2>
      <div className="mt-3 grid gap-2">
        {question.choices.map((choice, index) => {
          const isAnswer = correct !== null && choice.id === question.answerId
          const isPicked = choice.id === picked
          return (
            <Button
              key={choice.id}
              type="button"
              variant="outline"
              className={cn(
                "h-auto min-h-12 w-full justify-start gap-3 bg-card px-3 py-3 text-left text-base whitespace-normal",
                isAnswer && "border-emerald-600 bg-emerald-50",
                isPicked && !isAnswer && "border-orange-600 bg-orange-50",
              )}
              onClick={() => choose(choice.id)}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                {String.fromCharCode(65 + index)}
              </span>
              <span>{choice.text}</span>
            </Button>
          )
        })}
      </div>
      {correct !== null && (
        <div className="mt-4" role="status">
          <p className={cn("text-sm font-semibold", correct ? "text-good" : "text-speak")}>
            {correct ? "答對了。" : `這題想成「${chosen?.text ?? ""}」。`}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.explanation}</p>
          <Button type="button" className="mt-4 h-12 w-full text-base" onClick={onNext}>
            {step >= total ? "看結果" : "下一題"}
          </Button>
        </div>
      )}
    </section>
  )
}

function LevelChip({
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
      className={cn("h-9 rounded-full px-3 text-sm font-medium", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
    >
      {children}
    </button>
  )
}
