import { Volume2 } from "lucide-react"

export function SoundBars() {
  return (
    <span className="flex h-8 items-end gap-1" aria-hidden>
      {[0, 1, 2, 3].map((bar) => (
        <span
          key={bar}
          className="sound-bar w-1.5 rounded-full bg-current"
          style={{ height: `${14 + (bar % 2) * 12}px`, animationDelay: `${bar * 120}ms` }}
        />
      ))}
    </span>
  )
}

export function PlayButton({
  speaking,
  onClick,
  label = "播放",
  activeLabel = "播放中",
}: {
  speaking: boolean
  onClick: () => void
  label?: string
  activeLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={speaking ? "停止播放" : "播放英文"}
      className="flex size-36 flex-col items-center justify-center gap-1 rounded-full bg-primary text-primary-foreground shadow-[0_18px_40px_-20px] shadow-primary transition-transform active:scale-95"
    >
      {speaking ? <SoundBars /> : <Volume2 className="size-10" strokeWidth={1.75} />}
      <span className="text-sm font-medium">{speaking ? activeLabel : label}</span>
    </button>
  )
}
