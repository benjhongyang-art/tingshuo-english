import { useCallback, useEffect, useRef, useState } from "react"
import type { SpeechRate } from "../types.ts"

const RATES: Record<SpeechRate, number> = {
  slow: 0.68,
  normal: 1,
}

export function canRecognizeSpeech(): boolean {
  return typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

const HEARD_KEY = "tingshuo.heard"

export function hasHeardModel(): boolean {
  try {
    return sessionStorage.getItem(HEARD_KEY) === "1"
  } catch {
    return false
  }
}

export function markHeardModel(): void {
  try {
    sessionStorage.setItem(HEARD_KEY, "1")
  } catch {
    // Session storage can be blocked; playback still works for this tap.
  }
}

export function recognitionErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "無法使用麥克風。請在瀏覽器允許麥克風權限後再試一次。"
    case "no-speech":
      return "沒有聽到聲音。靠近一點，再清楚說一次。"
    case "audio-capture":
      return "找不到麥克風。請確認裝置有麥克風，並允許瀏覽器使用它。"
    case "network":
      return "語音辨識需要網路。請檢查連線後再試。"
    case "language-not-supported":
      return "這個瀏覽器的語音辨識不支援英文。請改用 Chrome 或 Edge。"
    case "aborted":
      return ""
    default:
      return "語音辨識暫時失敗。請再試一次。"
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? []
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"))
  return (
    english.find((voice) => /en-US/i.test(voice.lang) && /natural|samantha|aria|google/i.test(voice.name)) ??
    english.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ??
    english[0] ??
    null
  )
}

export function useEnglishSpeech() {
  const supported = canSpeak()
  const [speaking, setSpeaking] = useState(false)
  const [problem, setProblem] = useState("")
  const generation = useRef(0)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer)
    timers.current = []
  }, [])

  const later = useCallback(
    (delay: number, run: () => void) => {
      const timer = window.setTimeout(() => {
        timers.current = timers.current.filter((item) => item !== timer)
        run()
      }, delay)
      timers.current.push(timer)
    },
    [],
  )

  const stop = useCallback(() => {
    generation.current += 1
    clearTimers()
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [clearTimers])

  useEffect(() => {
    if (!supported) return
    const load = () => {
      pickVoice()
    }
    load()
    window.speechSynthesis.addEventListener("voiceschanged", load)
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load)
      generation.current += 1
      clearTimers()
      window.speechSynthesis.cancel()
    }
  }, [clearTimers, supported])

  const speak = useCallback(
    (text: string, rate: SpeechRate, source: "user" | "auto" = "user") => {
      if (!supported) return
      const id = generation.current + 1
      generation.current = id
      clearTimers()
      setProblem("")
      setSpeaking(true)

      const synth = window.speechSynthesis
      const started = Date.now()
      const release = () => {
        if (generation.current !== id) return
        const wait = Math.max(0, 1200 - (Date.now() - started))
        later(wait, () => {
          if (generation.current !== id) return
          if ((synth.speaking || synth.pending) && Date.now() - started < 12000) {
            later(250, release)
            return
          }
          setSpeaking(false)
        })
      }

      const startUtterance = () => {
        if (generation.current !== id) return
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "en-US"
        utterance.rate = RATES[rate]
        utterance.pitch = 1
        utterance.volume = 1
        const voice = pickVoice()
        if (voice) utterance.voice = voice
        utterance.onend = release
        utterance.onerror = (event) => {
          if (generation.current !== id) return
          if (
            source === "user" &&
            event.error !== "interrupted" &&
            event.error !== "canceled"
          ) {
            setProblem("這次沒有播出來。請再按一次；若仍然沒有聲音，請改用 Chrome。")
          }
          release()
        }
        synth.resume()
        synth.speak(utterance)
        later(8000, release)
      }

      // cancel() is async in Chrome and will swallow a speak() call made in the same turn.
      if (synth.speaking || synth.pending) {
        synth.cancel()
        later(80, startUtterance)
      } else {
        startUtterance()
      }
    },
    [clearTimers, later, supported],
  )

  return { speak, stop, speaking, supported, problem }
}

export function usePronunciationRecognizer() {
  const supported = canRecognizeSpeech()
  const recRef = useRef<EnglishSpeechRecognition | null>(null)
  const alive = useRef(true)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState("")

  const silence = useCallback((rec: EnglishSpeechRecognition) => {
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
  }, [])

  const abort = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    silence(rec)
    rec.abort()
    recRef.current = null
    setListening(false)
  }, [silence])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      const rec = recRef.current
      if (!rec) return
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      rec.abort()
    }
  }, [])

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
      if (!Ctor) return
      const previous = recRef.current
      if (previous) {
        silence(previous)
        previous.abort()
      }

      const rec = new Ctor()
      recRef.current = rec
      rec.lang = "en-US"
      rec.continuous = false
      rec.interimResults = true
      rec.maxAlternatives = 1
      let finalText = ""
      let errored = false
      setError("")
      setTranscript("")
      setListening(true)

      let latest = ""
      rec.onresult = (event) => {
        if (!alive.current || recRef.current !== rec) return
        let interim = ""
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const piece = event.results[index]?.[0]?.transcript ?? ""
          if (event.results[index]?.isFinal) finalText = `${finalText} ${piece}`.trim()
          else interim += piece
        }
        latest = (finalText || interim).trim()
        setTranscript(latest)
      }

      rec.onerror = (event) => {
        if (!alive.current || recRef.current !== rec) return
        errored = true
        const message = recognitionErrorMessage(event.error)
        if (message) setError(message)
        setListening(false)
      }

      rec.onend = () => {
        if (!alive.current || recRef.current !== rec) return
        setListening(false)
        const text = finalText.trim() || latest.trim()
        if (!errored && text) onFinal(text)
        else if (!errored) setError("沒有辨識到英文。再試一次。")
      }

      try {
        rec.start()
      } catch {
        setListening(false)
        setError("語音辨識暫時失敗。請再試一次。")
      }
    },
    [silence],
  )

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  return { supported, listening, transcript, error, setError, setTranscript, start, stop, abort }
}
