import { Segmented } from "@/components/segmented.tsx"
import { useTheme } from "@/lib/theme-context.tsx"
import type { ThemePreference } from "@/lib/theme.ts"

const options: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "系統" },
  { value: "light", label: "淺色" },
  { value: "dark", label: "深色" },
]

export function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  return <Segmented label="外觀" value={preference} onChange={setPreference} options={options} />
}
