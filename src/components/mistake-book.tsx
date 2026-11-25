import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { BackHeader } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import { grammarTopics } from "@/data/grammar.ts"
import { lessons } from "@/data/lessons.ts"
import { topicTitle } from "@/data/vocabulary.ts"
import {
  listMistakes,
  MASTERY_STREAK,
  parseMistakeSource,
  SPEAK_MASTERY_THRESHOLD,
  SPEAK_MISTAKE_THRESHOLD,
  type MistakeEntry,
  type MistakeSource,
} from "@/lib/mistakes.ts"
import { useReview } from "@/lib/review-context.tsx"
import { cn } from "cn"

const SOURCES: { value: MistakeSource | "all"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "listen", label: "聽力" },
  { value: "speak", label: "發音" },
  { value: "card", label: "閃卡" },
  { value: "grammar", label: "文法" },
  { value: "chat", label: "對話" },
]

const sourceLabel: Record<MistakeSource, string> = {
  listen: "聽力",
  speak: "發音",
  card: "閃卡",
  grammar: "文法",
  chat: "對話",
}

const topicOptions = [
  ...lessons.map((lesson) => ({ id: lesson.id, label: lesson.title })),
  ...grammarTopics.map((topic) => ({ id: topic.id, label: topic.title })),
  { id: "free", label: "自由聊天" },
]

const topicIds = new Set(topicOptions.map((item) => item.id))

function topicLabel(topicId: string): string {
  return topicOptions.find((item) => item.id === topicId)?.label ?? topicTitle(topicId)
}

export function MistakeBookPage() {
  const navigate = useNavigate()
  const { mistakes, mistakeCount, dismissMistake } = useReview()
  const [params, setParams] = useSearchParams()
  const source = parseMistakeSource(params.get("source"))
  const topicParam = params.get("topic")
  const topicId = topicParam && topicIds.has(topicParam) ? topicParam : "all"
  const shown = listMistakes(mistakes, { source, topicId })

  useEffect(() => {
    document.title = "錯題本 — 聽說"
  }, [])

  function update(next: { source?: MistakeSource | "all"; topic?: string }) {
    const query = new URLSearchParams(params)
    const sourceValue = next.source ?? source
    const topicValue = next.topic ?? topicId
    if (sourceValue === "all") query.delete("source")
    else query.set("source", sourceValue)
    if (topicValue === "all") query.delete("topic")
    else query.set("topic", topicValue)
    setParams(query, { replace: true })
  }

  function practice(mode: "listen" | "speak", id?: string) {
    const query = new URLSearchParams()
    if (!id && source !== "all") query.set("source", source)
    if (!id && topicId !== "all") query.set("topic", topicId)
    if (id) query.set("id", id)
    const search = query.toString()
    const suffix = search ? `?${search}` : ""
    navigate(`/mistakes/practice/${mode}${suffix}`)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
      <BackHeader title="錯題本" detail={`${mistakeCount} 則`} />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        聽力答錯、發音低於 {SPEAK_MISTAKE_THRESHOLD} 分、閃卡按「忘記」，或文法答錯，會自動收進來。和 AI
        對話時，也可以把改正的句子加進來。聽力答對、發音 {SPEAK_MASTERY_THRESHOLD}{" "}
        分以上、閃卡按「記得」，或文法再答對，連續 {MASTERY_STREAK} 次就移出。
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="來源">
        {SOURCES.map((option) => (
          <FilterChip key={option.value} selected={source === option.value} onClick={() => update({ source: option.value })}>
            {option.label}
          </FilterChip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="主題">
        <FilterChip selected={topicId === "all"} onClick={() => update({ topic: "all" })}>
          全部主題
        </FilterChip>
        {topicOptions.map((topic) => (
          <FilterChip key={topic.id} selected={topicId === topic.id} onClick={() => update({ topic: topic.id })}>
            {topic.label}
          </FilterChip>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" className="h-12 text-base" disabled={shown.length === 0} onClick={() => practice("listen")}>
          聽力複習
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 bg-card text-base"
          disabled={shown.length === 0}
          onClick={() => practice("speak")}
        >
          發音複習
        </Button>
      </div>

      {mistakeCount === 0 ? (
        <p className="mt-6 rounded-2xl bg-card px-4 py-4 text-sm leading-6 text-muted-foreground shadow-sm">
          還沒有錯題。練聽力、發音、單字或文法時，沒記住的句子會出現在這裡。
        </p>
      ) : shown.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-card px-4 py-4 text-sm leading-6 text-muted-foreground shadow-sm">
          這個篩選底下沒有錯題。
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((entry) => (
            <li key={entry.id}>
              <MistakeCard entry={entry} onPractice={practice} onRemove={() => dismissMistake(entry.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MistakeCard({
  entry,
  onPractice,
  onRemove,
}: {
  entry: MistakeEntry
  onPractice: (mode: "listen" | "speak", id: string) => void
  onRemove: () => void
}) {
  return (
    <article className="rounded-[1.6rem] border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {entry.sources.map((item) => (
          <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            {sourceLabel[item]}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">{topicLabel(entry.topicId)}</span>
      </div>
      <p lang="en" className="mt-3 font-display text-2xl leading-tight">
        {entry.en}
      </p>
      <p className="mt-1 text-muted-foreground">{entry.zh}</p>
      {entry.note && (
        <p lang="en" className="mt-2 text-sm leading-6 text-muted-foreground">
          {entry.note}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        錯過 {entry.wrongCount} 次 · 連續答對 {entry.correctStreak}/{MASTERY_STREAK}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button type="button" className="h-11 px-2 text-sm whitespace-normal" onClick={() => onPractice("listen", entry.id)}>
          聽力
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 bg-card px-2 text-sm whitespace-normal"
          onClick={() => onPractice("speak", entry.id)}
        >
          發音
        </Button>
        <Button type="button" variant="ghost" className="h-11 px-2 text-sm whitespace-normal" onClick={onRemove}>
          移出
        </Button>
      </div>
    </article>
  )
}

function FilterChip({
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
