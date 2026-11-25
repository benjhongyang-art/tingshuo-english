interface EnglishSpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((this: EnglishSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
  onerror: ((this: EnglishSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: EnglishSpeechRecognition, ev: Event) => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface Window {
  SpeechRecognition?: { new (): EnglishSpeechRecognition }
  webkitSpeechRecognition?: { new (): EnglishSpeechRecognition }
}
