import { useEffect, useRef, useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowUpDown, CircleQuestionMark, Clock, Languages, MapPin } from "lucide-react"
import { PracticeShell } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { getGrammarTopic, grammarTopics, questionsFor, type GrammarTopic } from "@/data/grammar.ts"
import { useGrammar } from "@/lib/grammar-context.tsx"
import { grammarAccuracy, grammarMistakeTarget, gradeGrammar, topicAccuracy, type GrammarQuestion } from "@/lib/grammar.ts"
import { useReview } from "@/lib/review-context.tsx"
import { cn } from "cn"

const topicIcon = {
  tenses: Clock,
  articles: Languages,
  prepositions: MapPin,
  comparatives: ArrowUpDown,
  questions: CircleQuestionMark,
}

const topicTone = [
  "bg-amber-100 text-amber-900",
  "bg-orange-100 text-orange-900",
  "bg-sky-100 text-sky-900",
  "bg-teal-100 text-teal-900",
  "bg-primary/10 text-primary",
]

export function GrammarHome() {
  const navigate = useNavigate()
  const { stats } = useGrammar()

  useEffect(() => {
    document.title = "文法練習 — 聽說"
  }, [])

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.16em] text-primary">GRAMMAR</p>
        <h1 className="mt-1 font-display text-4xl leading-none">文法練習</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          題目在這台裝置上，不需要網路，也不用 API 金鑰。送出答案後會看到中文說明。答錯的句子會進錯題本。
        </p>
      </header>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {grammarTopics.map((topic, index) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            tone={topicTone[index % topicTone.length] ?? topicTone[0]!}
            accuracy={topicAccuracy(stats, topic.id)}
            count={questionsFor(topic.id).length}
            onOpen={() => navigate(`/grammar/${topic.id}`)}
          />
        ))}
      </div>
      <div className="mt-6">
        <Button type="button" variant="outline" className="h-12 bg-card px-4 text-base" onClick={() => navigate("/")}>
          回到首頁
        </Button>
      </div>
    </div>
  )
}

function TopicCard({
  topic,
  tone,
  accuracy,
  count,
  onOpen,
}: {
  topic: GrammarTopic
  tone: string
  accuracy: number | null
  count: number
  onOpen: () => void
}) {
  const Icon = topicIcon[topic.id as keyof typeof topicIcon] ?? Clock
  return (
    <button type="button" onClick={onOpen} className="rounded-[1.6rem] border bg-card p-4 text-left shadow-sm">
      <span className="flex items-start gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", tone)}>
          <Icon className="size-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-semibold">{topic.title}</span>
          <span className="mt-1 block text-sm text-muted-foreground">{topic.blurb}</span>
          <span className="mt-2 block text-xs text-muted-foreground">
            {count} 題
            {accuracy === null ? " · 尚未作答" : ` · 正確率 ${accuracy}%`}
          </span>
        </span>
      </span>
    </button>
  )
}

export function GrammarQuiz() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const topic = getGrammarTopic(topicId)
  const questions = topic ? questionsFor(topic.id) : []
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [done, setDone] = useState(false)
  const [round, setRound] = useState(0)

  useEffect(() => {
    document.title = topic ? `文法 · ${topic.title} — 聽說` : "文法練習 — 聽說"
  }, [topic])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index, done, round])

  if (!topic || questions.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
        <h1 className="font-display text-4xl">找不到這個文法主題</h1>
        <p className="mt-3 text-muted-foreground">回到列表再挑一個主題。</p>
        <Button type="button" className="mt-6 h-12 w-fit px-5 text-base" onClick={() => navigate("/grammar")}>
          回到文法練習
        </Button>
      </div>
    )
  }

  const question = questions[index] ?? questions[0]!
  const correctCount = results.filter(Boolean).length

  return (
    <PracticeShell
      title={`${topic.title} · 文法`}
      step={done ? questions.length : index + 1}
      total={questions.length}
      backTo="/grammar"
      backLabel="回到文法練習"
    >
      {done ? (
        <RoundSummary
          title={topic.title}
          correct={correctCount}
          total={results.length}
          onAgain={() => {
            setIndex(0)
            setResults([])
            setDone(false)
            setRound((value) => value + 1)
          }}
        />
      ) : (
        <GrammarQuestionView
          key={`${round}:${question.id}`}
          question={question}
          isLast={index >= questions.length - 1}
          onAnswered={(correct) => setResults((prev) => [...prev, correct])}
          onNext={() => {
            if (index >= questions.length - 1) setDone(true)
            else setIndex((value) => value + 1)
          }}
        />
      )}
    </PracticeShell>
  )
}

function GrammarQuestionView({
  question,
  isLast,
  onAnswered,
  onNext,
}: {
  question: GrammarQuestion
  isLast: boolean
  onAnswered: (correct: boolean) => void
  onNext: () => void
}) {
  const { record } = useGrammar()
  const { noteGrammar } = useReview()
  const [picked, setPicked] = useState<string | null>(null)
  const [typed, setTyped] = useState("")
  const [draftError, setDraftError] = useState("")
  const [correct, setCorrect] = useState<boolean | null>(null)
  const recorded = useRef(false)

  function finish(input: string) {
    if (recorded.current) return
    recorded.current = true
    const ok = gradeGrammar(question, input)
    setCorrect(ok)
    record(question.topicId, ok)
    noteGrammar(grammarMistakeTarget(question, input), ok)
    onAnswered(ok)
  }

  function choose(option: string) {
    if (correct !== null) return
    setPicked(option)
    finish(option)
  }

  function submitBlank(event: FormEvent) {
    event.preventDefault()
    if (correct !== null) return
    if (!typed.trim()) {
      setDraftError("請先填入空格的英文。")
      return
    }
    finish(typed)
  }

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm text-muted-foreground">{question.prompt}</p>
      <p lang="en" className="mt-3 font-display text-3xl leading-tight text-balance">
        {question.sentence}
      </p>

      {correct === null ? (
        question.kind === "choice" ? (
          <div className="mt-6 grid gap-2">
            {(question.choices ?? []).map((option, optionIndex) => (
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
          <form className="mt-6" onSubmit={submitBlank}>
            <label className="mb-2 block text-sm font-medium" htmlFor="grammar-blank">
              填入空格的英文
            </label>
            <Input
              id="grammar-blank"
              lang="en"
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value)
                setDraftError("")
              }}
              placeholder="例如 met"
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
              送出
            </Button>
          </form>
        )
      ) : (
        <section aria-live="polite" className="mt-6 rounded-[1.75rem] border bg-card p-5 shadow-sm">
          <p className={correct ? "text-sm font-semibold text-good" : "text-sm font-semibold text-speak"}>
            {correct ? "答對了。" : "這次不對。"}
          </p>
          {!correct && question.kind === "blank" && (
            <p className="mt-2 text-sm text-muted-foreground">
              你填的是 <span lang="en">{typed.trim()}</span>
            </p>
          )}
          {!correct && question.kind === "choice" && picked && (
            <p className="mt-2 text-sm text-muted-foreground">
              你選的是 <span lang="en">{picked}</span>
            </p>
          )}
          <p className="mt-4 text-xs font-medium text-muted-foreground">正確句子</p>
          <p lang="en" className="mt-1 font-display text-2xl leading-tight">
            {question.correctSentence}
          </p>
          <p className="mt-4 text-xs font-medium text-muted-foreground">說明</p>
          <p className="mt-1 text-base leading-7">{question.explanation}</p>
          {question.kind === "choice" && (
            <div className="mt-4 grid gap-2">
              {(question.choices ?? []).map((option) => {
                const isAnswer = option === question.answer
                const isPicked = option === picked
                return (
                  <p
                    key={option}
                    lang="en"
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm",
                      isAnswer && "border-emerald-600 bg-emerald-50",
                      isPicked && !isAnswer && "border-orange-600 bg-orange-50",
                    )}
                  >
                    {option}
                    {isAnswer ? " · 正確" : ""}
                  </p>
                )
              })}
            </div>
          )}
          <Button type="button" className="mt-5 h-12 w-full text-base" onClick={onNext}>
            {isLast ? "看結果" : "下一題"}
          </Button>
        </section>
      )}
    </div>
  )
}

function RoundSummary({
  title,
  correct,
  total,
  onAgain,
}: {
  title: string
  correct: number
  total: number
  onAgain: () => void
}) {
  const navigate = useNavigate()
  const accuracy = grammarAccuracy(correct, total)
  const ratio = total === 0 ? 0 : correct / total
  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <p className="text-sm font-semibold tracking-[0.14em] text-primary">{title}</p>
      <h2 className="mt-2 font-display text-4xl">這一輪練完了</h2>
      <p className="mt-3 text-muted-foreground">{summaryCopy(ratio)}</p>
      <p className="mt-6 font-display text-5xl">
        {correct}
        <span className="text-2xl text-muted-foreground"> / {total}</span>
      </p>
      <p className="text-sm text-muted-foreground">{accuracy === null ? "答對題數" : `答對題數 · 正確率 ${accuracy}%`}</p>
      <div className="mt-8 grid gap-2">
        <Button type="button" className="h-12 text-base" onClick={onAgain}>
          再練一輪
        </Button>
        <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={() => navigate("/grammar")}>
          換一個主題
        </Button>
        <Button type="button" variant="ghost" className="h-12 text-base" onClick={() => navigate("/mistakes?source=grammar")}>
          看文法錯題
        </Button>
      </div>
    </div>
  )
}

function summaryCopy(ratio: number): string {
  if (ratio >= 1) return "這一輪都對了。這個文法點很穩。"
  if (ratio >= 0.7) return "大部分都對。錯的那幾題可以再到錯題本看一次。"
  if (ratio >= 0.4) return "已經有感覺了。看完說明，再練一輪會更熟。"
  return "先把說明看懂就好。再練一輪，慢慢來。"
}
