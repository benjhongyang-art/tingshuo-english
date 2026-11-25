import { useCallback, useState } from "react"
import type { SpeechRate } from "../types.ts"
import { loadRate, saveRate } from "./storage.ts"

export function useRate(): [SpeechRate, (rate: SpeechRate) => void] {
  const [rate, setRate] = useState<SpeechRate>(() => loadRate())
  const update = useCallback((next: SpeechRate) => {
    setRate(next)
    saveRate(next)
  }, [])
  return [rate, update]
}
