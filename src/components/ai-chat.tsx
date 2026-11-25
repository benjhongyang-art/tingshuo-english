import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Mic, Send, Settings, Volume2 } from "lucide-react"
import { BackHeader } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import { recordPractice } from "@/lib/activity-store.ts"
import { requestTutorReply, type AiErrorCode } from "@/lib/ai-client.ts"
import {
  buildTutorMessages,
  levelById,
  LEVELS,
  scenarioById,
  scenarios,
  type TutorReply,
} from "@/lib/ai-prompt.ts"
import { hasApiKey, loadAiSettings, saveAiSettings, type AiSettings } from "@/lib/ai-settings.ts"
import { chatPhraseTarget, mistakeId } from "@/lib/mistakes.ts"
import { calendarDay } from "@/lib/progress.ts"
import { useProgress } from "@/lib/progress-context.tsx"
import { useReview } from "@/lib/review-context.tsx"
import { useEnglishSpeech, usePronunciationRecognizer } from "@/lib/speech.ts"
import { useStudyTimer } from "@/lib/study-timer.ts"
import { useRate } from "@/lib/use-rate.ts"
import { cn } from "cn"
import { Segmented } from "@/components/segmented.tsx"

type Bubble = {
  id: string
  role: "user" | "assistant"
  text: string
  correction: string | null
  correctionZh: string | null
  hint: string | null
}

type ChatError = {
  code: AiErrorCode
  message: string
}

function opener(scenarioId: string): Bubble {
  const scenario = scenarioById(scenarioId)
  return {
    id: `open-${scenario.id}`,
    role: "assistant",
    text: scenario.opener,
    correction: null,
    correctionZh: null,
    hint: null,
  }
}

export function AiChatScreen() {
  const navigate = useNavigate()
  const { markToday } = useProgress()
  const { mistakes, addChatPhrase } = useReview()
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [messages, setMessages] = useState<Bubble[]>(() => [opener(loadAiSettings().scenarioId)])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ChatError | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set())
  const [rate, setRate] = useRate()
  const speech = useEnglishSpeech()
  const recognizer = usePronunciationRecognizer()
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false))
  const requestId = useRef(0)
  useStudyTimer()
  const pendingRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scenario = scenarioById(settings.scenarioId)
  const level = levelById(settings.level)

  useEffect(() => {
    document.title = "英文對話 — 聽說"
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, pending, error])

  const composer = recognizer.listening && recognizer.transcript ? recognizer.transcript : draft

  function persist(next: AiSettings) {
    saveAiSettings(next)
    setSettings(next)
  }

  function changeScenario(id: string) {
    requestId.current += 1
    pendingRef.current = false
    recognizer.abort()
    speech.stop()
    setPending(false)
    setError(null)
    setDraft("")
    const next = { ...loadAiSettings(), scenarioId: id }
    persist(next)
    setMessages([opener(id)])
  }

  async function submit(text: string, mode: "new" | "retry") {
    const spoken = text.trim()
    if (!spoken || pendingRef.current) {
      if (spoken && pendingRef.current) setDraft(spoken)
      return
    }
    pendingRef.current = true
    recognizer.abort()
    speech.stop()
    const current = loadAiSettings()
    setSettings(current)
    const history = mode === "retry" ? messages : [...messages, userBubble(spoken)]
    if (mode === "new") {
      setMessages(history)
      recordPractice(calendarDay(new Date()), { items: 1 })
    }
    setDraft("")
    setError(null)
    setPending(true)
    const id = requestId.current + 1
    requestId.current = id
    const activeScenario = scenarioById(current.scenarioId)
    const result = await requestTutorReply({
      settings: current,
      messages: buildTutorMessages({
        scenario: activeScenario,
        level: current.level,
        showHint: current.showHint,
        history: history.map((item) => ({ role: item.role, text: item.text })),
      }),
    })
    if (requestId.current !== id) return
    pendingRef.current = false
    setPending(false)
    if (!result.ok) {
      if (result.code !== "aborted" && result.message) setError({ code: result.code, message: result.message })
      return
    }
    setMessages((prev) => [...prev, assistantBubble(result.reply)])
    markToday()
    if (current.autoSpeak) speech.speak(result.reply.english, rate)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void submit(composer, "new")
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit(composer, "new")
    }
  }

  function listen() {
    if (recognizer.listening) {
      recognizer.stop()
      return
    }
    speech.stop()
    recognizer.start((text) => {
      void submit(text, "new")
    })
  }

  function savePhrase(bubble: Bubble, learnerText: string) {
    if (!bubble.correction) return
    addChatPhrase(
      chatPhraseTarget({
        topicId: scenario.topicId,
        correction: bubble.correction,
        correctionZh: bubble.correctionZh,
        learnerText,
      }),
    )
    setSavedIds((prev) => new Set(prev).add(bubble.id))
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <BackHeader
        title="英文對話"
        detail={scenario.title}
        extra={
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full bg-card px-3"
            onClick={() => navigate("/chat/settings")}
          >
            <Settings />
            設定
          </Button>
        }
      />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="情境">
        {scenarios.map((item) => {
          const selected = item.id === scenario.id
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => changeScenario(item.id)}
              className={cn(
                "h-10 shrink-0 rounded-full px-3 text-sm font-medium",
                selected ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground",
              )}
            >
              {item.title}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{scenario.blurb}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented
          label="程度"
          value={level.id}
          onChange={(value) => persist({ ...settings, level: value })}
          options={LEVELS.map((item) => ({ value: item.id, label: item.label }))}
        />
        <Segmented
          label="朗讀速度"
          value={rate}
          onChange={setRate}
          options={[
            { value: "slow", label: "慢速" },
            { value: "normal", label: "正常" },
          ]}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Toggle
          pressed={settings.showHint}
          label="中文提示"
          onClick={() => persist({ ...settings, showHint: !settings.showHint })}
        />
        <Toggle
          pressed={settings.autoSpeak}
          label="朗讀回覆"
          onClick={() => persist({ ...settings, autoSpeak: !settings.autoSpeak })}
        />
      </div>

      {!online && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          目前沒有網路，無法進行英文對話。請連上網路後再試。聽力、發音、單字、文法、閱讀和錯題本都可以離線使用。
        </div>
      )}

      {!hasApiKey(settings) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          <p>還沒有 API 金鑰。金鑰只存在這台瀏覽器，呼叫費用會計入你自己的帳戶。</p>
          <Button type="button" className="mt-2 h-10 px-3" onClick={() => navigate("/chat/settings")}>
            前往設定
          </Button>
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {messages.map((bubble, index) => (
          <Message
            key={bubble.id}
            bubble={bubble}
            showHint={settings.showHint}
            speaking={speech.speaking}
            saved={isSaved(bubble, messages, index, scenario.topicId, savedIds, mistakes.items)}
            onSpeak={() => {
              if (speech.speaking) speech.stop()
              else speech.speak(bubble.text, rate)
            }}
            onSave={() => savePhrase(bubble, previousUserText(messages, index))}
          />
        ))}
        {pending && (
          <p className="rounded-[1.4rem] border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm" role="status">
            老師正在想怎麼回你…
          </p>
        )}
        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="alert">
            <p>{error.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {error.code === "missing-key" || error.code === "invalid-key" || error.code === "bad-url" ? (
                <Button type="button" className="h-10 px-3" onClick={() => navigate("/chat/settings")}>
                  前往設定
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 bg-card px-3"
                  onClick={() => {
                    const last = [...messages].reverse().find((item) => item.role === "user")
                    if (last) void submit(last.text, "retry")
                  }}
                >
                  再試一次
                </Button>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="mt-4" onSubmit={onSubmit}>
        <label className="mb-2 block text-sm font-medium" htmlFor="chat-draft">
          用英文說一句
        </label>
        <textarea
          id="chat-draft"
          lang="en"
          value={composer}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={recognizer.listening ? "正在聽你說…" : "用英文說一句，或打字"}
          rows={2}
          maxLength={500}
          disabled={pending}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="min-h-12 w-full resize-none rounded-2xl border border-input bg-card px-3 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
        {recognizer.error && (
          <p className="mt-2 text-sm text-speak" role="alert">
            {recognizer.error}
          </p>
        )}
        {speech.problem && (
          <p className="mt-2 text-sm text-speak" role="status">
            {speech.problem}
          </p>
        )}
        {!recognizer.supported && (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            這個瀏覽器不能用語音輸入，請直接打字。Chrome 或 Edge 可以用麥克風。
          </p>
        )}
        <div className={cn("mt-2 grid gap-2", recognizer.supported ? "grid-cols-[auto_1fr]" : "grid-cols-1")}>
          {recognizer.supported && (
            <Button
              type="button"
              variant="outline"
              className={cn("h-12 bg-card px-4 text-base", recognizer.listening && "mic-live border-speak text-speak")}
              onClick={listen}
              disabled={pending}
              aria-pressed={recognizer.listening}
            >
              <Mic />
              {recognizer.listening ? "停止" : "說話"}
            </Button>
          )}
          <Button type="submit" className="h-12 text-base" disabled={pending || composer.trim() === ""}>
            <Send />
            送出
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          回覆由你設定的 API 產生。金鑰只留在這台瀏覽器，費用記入你的帳戶。
        </p>
      </form>
    </div>
  )
}

function userBubble(text: string): Bubble {
  return {
    id: `user-${Date.now()}-${text.length}`,
    role: "user",
    text,
    correction: null,
    correctionZh: null,
    hint: null,
  }
}

function assistantBubble(reply: TutorReply): Bubble {
  return {
    id: `ai-${Date.now()}`,
    role: "assistant",
    text: reply.english,
    correction: reply.correction,
    correctionZh: reply.correctionZh,
    hint: reply.hint,
  }
}

function previousUserText(messages: Bubble[], index: number): string {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const item = messages[cursor]
    if (item?.role === "user") return item.text
  }
  return ""
}

function isSaved(
  bubble: Bubble,
  messages: Bubble[],
  index: number,
  topicId: string,
  savedIds: Set<string>,
  items: { id: string }[],
): boolean {
  if (!bubble.correction) return false
  if (savedIds.has(bubble.id)) return true
  const target = chatPhraseTarget({
    topicId,
    correction: bubble.correction,
    correctionZh: bubble.correctionZh,
    learnerText: previousUserText(messages, index),
  })
  const id = mistakeId(target)
  return items.some((item) => item.id === id)
}

function Message({
  bubble,
  showHint,
  speaking,
  saved,
  onSpeak,
  onSave,
}: {
  bubble: Bubble
  showHint: boolean
  speaking: boolean
  saved: boolean
  onSpeak: () => void
  onSave: () => void
}) {
  if (bubble.role === "user") {
    return (
      <div className="ml-10 rounded-[1.4rem] rounded-br-md bg-primary px-4 py-3 text-primary-foreground">
        <p lang="en">{bubble.text}</p>
      </div>
    )
  }

  return (
    <article className="mr-6 rounded-[1.4rem] rounded-bl-md border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2">
        <p lang="en" className="min-w-0 flex-1 text-base leading-7">
          {bubble.text}
        </p>
        <button
          type="button"
          className="grid size-9 shrink-0 place-items-center rounded-full text-primary hover:bg-muted"
          aria-label={speaking ? "停止朗讀" : "朗讀這句"}
          onClick={onSpeak}
        >
          <Volume2 className="size-4" />
        </button>
      </div>
      {showHint && bubble.hint && <p className="mt-2 text-sm leading-6 text-muted-foreground">中文提示：{bubble.hint}</p>}
      {bubble.correction && (
        <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-3 text-amber-950">
          <p className="text-xs font-medium">可以這樣說</p>
          <p lang="en" className="mt-1 text-base leading-6">
            {bubble.correction}
          </p>
          {bubble.correctionZh && <p className="mt-1 text-sm leading-6">{bubble.correctionZh}</p>}
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10 bg-card px-3"
            disabled={saved}
            onClick={onSave}
          >
            {saved ? "已在錯題本" : "加入錯題本"}
          </Button>
        </div>
      )}
    </article>
  )
}

function Toggle({ pressed, label, onClick }: { pressed: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3 text-sm font-medium",
        pressed ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}
