import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button.tsx"

export function PracticeShell({
  title,
  step,
  total,
  backTo = "/",
  backLabel = "回到首頁",
  children,
}: {
  title: string
  step: number
  total: number
  backTo?: string
  backLabel?: string
  children: ReactNode
}) {
  const navigate = useNavigate()
  const width = total === 0 ? 0 : Math.min(100, Math.round((step / total) * 100))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 rounded-full bg-card"
          aria-label={backLabel}
          onClick={() => navigate(backTo)}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="text-sm font-semibold">
            {step} / {total}
          </p>
        </div>
      </header>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={Math.min(step, total)}
        aria-label="本輪進度"
      >
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </div>
  )
}

export function BackHeader({
  title,
  detail,
  to = "/",
  extra,
}: {
  title: string
  detail?: string
  to?: string
  extra?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="size-11 rounded-full bg-card"
        aria-label="返回"
        onClick={() => navigate(to)}
      >
        <ArrowLeft className="size-5" />
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {detail && <p className="truncate text-sm text-muted-foreground">{detail}</p>}
      </div>
      {extra}
    </header>
  )
}

export function MissingLesson() {
  const navigate = useNavigate()
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
      <h1 className="font-display text-4xl">找不到這個主題</h1>
      <p className="mt-3 text-muted-foreground">這個連結沒有對應的課程。回到首頁再挑一個主題。</p>
      <Button type="button" className="mt-6 h-12 w-fit px-5 text-base" onClick={() => navigate("/")}>
        回到首頁
      </Button>
    </div>
  )
}
