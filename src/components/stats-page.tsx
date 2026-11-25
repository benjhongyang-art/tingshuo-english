import { useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { BackHeader } from "@/components/practice-shell.tsx"
import { BarChart, LineChart } from "@/components/charts.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Segmented } from "@/components/segmented.tsx"
import { loadActivity } from "@/lib/activity-store.ts"
import { rangeSummary, trend } from "@/lib/activity.ts"
import { useReview } from "@/lib/review-context.tsx"
import { calendarDay } from "@/lib/progress.ts"

type Range = "7" | "30"

function percent(value: number | null): string {
  return value === null ? "—" : `${value}%`
}

export function StatsPage() {
  const navigate = useNavigate()
  const { mistakeCount } = useReview()
  const [range, setRange] = useState<Range>("7")
  const [today] = useState(() => calendarDay(new Date()))
  const count = range === "30" ? 30 : 7
  const log = loadActivity()
  const points = trend(log, today, count)
  const summary = rangeSummary(log, today, count)
  const notebook = summary.mistakeCount ?? mistakeCount

  useEffect(() => {
    document.title = "學習統計 — 聽說"
  }, [])

  const days = range === "30" ? "30 天" : "7 天"
  const empty = summary.recordedDays === 0

  return (
    <div className="mx-auto min-h-dvh w-full max-w-3xl px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6">
      <BackHeader
        title="學習統計"
        detail={days}
        extra={
          <Segmented
            label="統計範圍"
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 天" },
              { value: "30", label: "30 天" },
            ]}
          />
        }
      />
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        每天的練習從現在開始記在這台瀏覽器。以前的聽力、發音和文法成績還在，只是沒有拆成每一天，所以圖表不會補上過去的日子。
      </p>
      {empty && (
        <p className="mt-3 rounded-2xl bg-card px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm">
          還沒有每日紀錄。去練一題，或打開這個畫面記下今天的錯題本大小，圖就會開始出現。
        </p>
      )}

      <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="這段期間">
        <Mini label="完成" value={`${summary.items}`} unit="題" />
        <Mini label="時長" value={`${summary.minutes}`} unit="分鐘" />
        <Mini label="閃卡" value={`${summary.cardsReviewed}`} unit="張" />
        <Mini label="錯題本" value={`${notebook}`} unit="則" />
      </section>

      <ChartCard title="每日練習題數" detail={`${days}合計 ${summary.items} 題`}>
        <BarChart points={points} values={points.map((point) => point.items)} ariaLabel={`${days}每日練習題數`} color="var(--chart-1)" />
      </ChartCard>
      <ChartCard title="聽力正確率" detail={`這段期間 ${percent(summary.listenAccuracy)}`}>
        <LineChart
          points={points}
          values={points.map((point) => point.listenAccuracy)}
          ariaLabel={`${days}聽力正確率`}
          color="var(--chart-1)"
          max={100}
        />
      </ChartCard>
      <ChartCard title="發音平均分" detail={`這段期間 ${summary.speakAverage === null ? "—" : summary.speakAverage}`}>
        <LineChart
          points={points}
          values={points.map((point) => point.speakAverage)}
          ariaLabel={`${days}發音平均分`}
          color="var(--chart-2)"
          max={100}
        />
      </ChartCard>
      <ChartCard title="文法正確率" detail={`這段期間 ${percent(summary.grammarAccuracy)}`}>
        <LineChart
          points={points}
          values={points.map((point) => point.grammarAccuracy)}
          ariaLabel={`${days}文法正確率`}
          color="var(--chart-5)"
          max={100}
        />
      </ChartCard>
      <ChartCard title="閱讀正確率" detail={`這段期間 ${percent(summary.readingAccuracy)}`}>
        <LineChart
          points={points}
          values={points.map((point) => point.readingAccuracy)}
          ariaLabel={`${days}閱讀正確率`}
          color="var(--chart-4)"
          max={100}
        />
      </ChartCard>
      <ChartCard title="閃卡複習張數" detail={`${days}合計 ${summary.cardsReviewed} 張`}>
        <BarChart
          points={points}
          values={points.map((point) => point.cardsReviewed)}
          ariaLabel={`${days}閃卡複習張數`}
          color="var(--chart-3)"
        />
      </ChartCard>
      <ChartCard title="錯題本大小" detail="有紀錄的日子才會畫出點。今天打開 App 就會記一次。">
        <LineChart
          points={points}
          values={points.map((point) => point.mistakeCount)}
          ariaLabel={`${days}錯題本則數`}
          color="var(--speak)"
        />
      </ChartCard>

      <div className="mt-6">
        <Button type="button" variant="outline" className="h-12 bg-card px-4 text-base" onClick={() => navigate("/")}>
          回到首頁
        </Button>
      </div>
    </div>
  )
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl border bg-card px-2 py-3 text-center shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{unit}</p>
    </div>
  )
}

function ChartCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[1.6rem] border bg-card p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      <div className="mt-2">{children}</div>
    </section>
  )
}
