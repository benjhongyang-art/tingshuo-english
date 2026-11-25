import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BookOpen, Briefcase, Flame, Layers, Mic, Plane, SunMedium, Utensils, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button.tsx"
import { lessons, itemKey, getLesson, totalItemCount } from "@/data/lessons.ts"
import { countPracticed } from "@/lib/progress.ts"
import { useProgress } from "@/lib/progress-context.tsx"
import { useReview } from "@/lib/review-context.tsx"
import { canRecognizeSpeech } from "@/lib/speech.ts"
import { loadLast } from "@/lib/storage.ts"
import type { Lesson, LessonTone } from "@/types.ts"
import { cn } from "cn"

const toneClass: Record<LessonTone, { icon: string; bar: string }> = {
  amber: { icon: "bg-amber-100 text-amber-900", bar: "bg-amber-600" },
  orange: { icon: "bg-orange-100 text-orange-900", bar: "bg-orange-600" },
  sky: { icon: "bg-sky-100 text-sky-900", bar: "bg-sky-700" },
  teal: { icon: "bg-teal-100 text-teal-900", bar: "bg-teal-700" },
}

const lessonIcon = {
  greetings: SunMedium,
  food: Utensils,
  travel: Plane,
  work: Briefcase,
}

export function HomeScreen() {
  const navigate = useNavigate()
  const { state, summary } = useProgress()
  const { due, mistakeCount } = useReview()
  const recognition = canRecognizeSpeech()
  const last = loadLast()
  const lastLesson = last ? getLesson(last.lessonId) : undefined
  const total = totalItemCount()

  useEffect(() => {
    document.title = "聽說 — 英文聽力與發音"
  }, [])

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Volume2 className="size-6" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary">LISTEN · SPEAK</p>
          <h1 className="font-display text-4xl leading-none">聽說</h1>
        </div>
      </header>

      <section className="mt-5 rounded-[1.75rem] bg-primary px-5 py-5 text-primary-foreground sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-3xl leading-tight">先聽清楚，再說一次。</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-foreground/85">
              給繁體中文使用者的英文聽力與發音練習。短句、慢速、每天一點點就夠。
            </p>
          </div>
          <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium">
            <Flame className="size-4 text-amber-200" />
            {summary.streak > 0 ? `連續 ${summary.streak} 天` : "今天開始"}
          </p>
        </div>
        {last && lastLesson && (
          <Button
            type="button"
            className="mt-4 h-11 bg-white px-4 text-base text-teal-950 hover:bg-white/90"
            onClick={() =>
              navigate(last.mode === "listen" ? `/listen/${last.lessonId}` : `/speak/${last.lessonId}`)
            }
          >
            繼續：{lastLesson.title} · {last.mode === "listen" ? "聽力" : "發音"}
          </Button>
        )}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="複習">
        <button
          type="button"
          onClick={() => navigate("/cards")}
          className="rounded-[1.6rem] border bg-card p-4 text-left shadow-sm"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Layers className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold">單字閃卡</span>
              <span className="mt-1 block font-display text-3xl leading-none">{due.due}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {due.due === 0 ? "今天都複習完了" : "今日待複習"}
              </span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/mistakes")}
          className="rounded-[1.6rem] border bg-card p-4 text-left shadow-sm"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-900">
              <BookOpen className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-semibold">錯題本</span>
              <span className="mt-1 block font-display text-3xl leading-none">{mistakeCount}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {mistakeCount === 0 ? "目前沒有錯題" : "則待加強"}
              </span>
            </span>
          </span>
        </button>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-2 sm:gap-3" aria-label="練習進度">
        <Stat label="已練" value={`${summary.practiced}`} unit={`共 ${total} 題`} />
        <Stat
          label="聽力"
          value={summary.listenAccuracy === null ? "—" : `${summary.listenAccuracy}%`}
          unit="正確率"
        />
        <Stat label="發音" value={summary.speakAverage === null ? "—" : `${summary.speakAverage}`} unit="平均分" />
      </section>

      {summary.practiced === 0 && (
        <p className="mt-3 rounded-2xl bg-card px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm">
          還沒有練習紀錄。挑一個主題，從第一句開始就好。
        </p>
      )}

      {!recognition && (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="status">
          這個瀏覽器不支援語音辨識。聽力練習仍可使用；發音評分請改用 Chrome 或 Edge，並允許麥克風。
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold">四個生活主題</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            practiced={countPracticed(
              state,
              lesson.items.map((item) => itemKey(lesson.id, item.id)),
            )}
            onListen={() => navigate(`/listen/${lesson.id}`)}
            onSpeak={() => navigate(`/speak/${lesson.id}`)}
          />
        ))}
      </div>
      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
        進度只存在這台裝置的瀏覽器裡，不會上傳。
      </p>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border bg-card px-2 py-3 text-center shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none sm:text-3xl">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{unit}</p>
    </div>
  )
}

function LessonCard({
  lesson,
  practiced,
  onListen,
  onSpeak,
}: {
  lesson: Lesson
  practiced: number
  onListen: () => void
  onSpeak: () => void
}) {
  const tone = toneClass[lesson.tone]
  const Icon = lessonIcon[lesson.id as keyof typeof lessonIcon] ?? SunMedium
  const width = Math.round((practiced / lesson.items.length) * 100)

  return (
    <article className="rounded-[1.6rem] border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", tone.icon)}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{lesson.title}</h3>
          <p className="text-sm text-muted-foreground">{lesson.blurb}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{lesson.items.length} 句</span>
          <span>已練 {practiced}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={lesson.items.length}
          aria-valuenow={practiced}
          aria-label={`${lesson.title}已練習 ${practiced} 句`}
        >
          <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${width}%` }} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" className="h-12 text-base" onClick={onListen}>
          <Volume2 />
          聽力
        </Button>
        <Button type="button" variant="outline" className="h-12 bg-card text-base" onClick={onSpeak}>
          <Mic />
          發音
        </Button>
      </div>
    </article>
  )
}
