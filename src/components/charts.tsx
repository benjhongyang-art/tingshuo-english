import type { TrendPoint } from "@/lib/activity.ts"

const WIDTH = 640
const HEIGHT = 188
const PAD_L = 32
const PAD_R = 8
const PAD_T = 12
const PAD_B = 28

function slot(count: number): number {
  return count === 0 ? 0 : (WIDTH - PAD_L - PAD_R) / count
}

function showLabel(index: number, count: number): boolean {
  if (count <= 8) return true
  return index === count - 1 || index % 5 === 0
}

export function BarChart({
  points,
  values,
  ariaLabel,
  color = "var(--chart-1)",
}: {
  points: TrendPoint[]
  values: number[]
  ariaLabel: string
  color?: string
}) {
  const max = Math.max(1, ...values)
  const width = slot(values.length)
  const plot = HEIGHT - PAD_T - PAD_B
  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="w-full">
        <line x1={PAD_L} y1={HEIGHT - PAD_B} x2={WIDTH - PAD_R} y2={HEIGHT - PAD_B} stroke="var(--border)" />
        {values.map((value, index) => {
          const bar = value <= 0 ? 0 : Math.max(2, (value / max) * plot)
          const x = PAD_L + index * width + width * 0.22
          return (
            <rect
              key={points[index]?.date ?? index}
              x={x}
              y={HEIGHT - PAD_B - bar}
              width={Math.max(1, width * 0.56)}
              height={bar}
              rx={3}
              fill={color}
            >
              <title>{`${points[index]?.label ?? ""} ${value}`}</title>
            </rect>
          )
        })}
        {points.map((point, index) =>
          showLabel(index, points.length) ? (
            <text
              key={point.date}
              x={PAD_L + index * width + width / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      <DataTable caption={ariaLabel} points={points} values={values} />
    </figure>
  )
}

export function LineChart({
  points,
  values,
  ariaLabel,
  color = "var(--chart-2)",
  max,
}: {
  points: TrendPoint[]
  values: Array<number | null>
  ariaLabel: string
  color?: string
  max?: number
}) {
  const known = values.filter((value): value is number => value !== null)
  const top = max ?? Math.max(1, ...known, 1)
  const width = slot(values.length)
  const plot = HEIGHT - PAD_T - PAD_B
  const coords = values.map((value, index) => {
    if (value === null) return null
    const x = PAD_L + index * width + width / 2
    const y = HEIGHT - PAD_B - (value / top) * plot
    return { x, y, value, index }
  })
  const lines: string[] = []
  let current = ""
  for (const point of coords) {
    if (!point) {
      if (current) lines.push(current)
      current = ""
      continue
    }
    current += `${current ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)} `
  }
  if (current) lines.push(current)

  return (
    <figure>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="w-full">
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={HEIGHT - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={HEIGHT - PAD_B} x2={WIDTH - PAD_R} y2={HEIGHT - PAD_B} stroke="var(--border)" />
        <text x={4} y={PAD_T + 8} fill="var(--muted-foreground)" fontSize="11">
          {top}
        </text>
        {lines.map((path, index) => (
          <path key={index} d={path.trim()} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
        ))}
        {coords.map((point) =>
          point ? <circle key={points[point.index]?.date ?? point.index} cx={point.x} cy={point.y} r={3.5} fill={color} /> : null,
        )}
        {points.map((point, index) =>
          showLabel(index, points.length) ? (
            <text
              key={point.date}
              x={PAD_L + index * width + width / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="11"
            >
              {point.label}
            </text>
          ) : null,
        )}
      </svg>
      <DataTable
        caption={ariaLabel}
        points={points}
        values={values.map((value) => (value === null ? "—" : String(value)))}
      />
    </figure>
  )
}

function DataTable({
  caption,
  points,
  values,
}: {
  caption: string
  points: TrendPoint[]
  values: Array<number | string>
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>日期</th>
          <th>數值</th>
        </tr>
      </thead>
      <tbody>
        {points.map((point, index) => (
          <tr key={point.date}>
            <td>{point.date}</td>
            <td>{values[index]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
