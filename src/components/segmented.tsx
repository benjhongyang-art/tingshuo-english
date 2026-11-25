import { cn } from "cn"

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 rounded-full px-3 text-sm font-medium transition-colors",
              selected ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
