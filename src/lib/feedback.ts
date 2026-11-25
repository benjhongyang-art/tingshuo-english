import type { Assessment } from "./score.ts"

export function speakFeedback(result: Assessment): string {
  if (result.exact) return "非常清楚，說得很漂亮。"
  if (result.score >= 90) return "很接近了。把多出來的字收一收。"
  if (result.score >= 75) return "很棒，只差一點點。看一下標色的字。"
  if (result.score >= 50) return "已經有樣子了。先聽示範，再跟著說一次。"
  if (result.score >= 25) return "有聽到一些字。一個字一個字跟著說。"
  return "沒關係，我們慢慢來。先聽一次，再跟著說。"
}

export function dictationFeedback(result: Assessment): string {
  if (result.exact) return "完全正確。"
  if (result.score >= 70) return "很接近了。標色的地方再看一眼。"
  return "再聽一次，對照正確句子。"
}

export function choiceFeedback(correct: boolean): string {
  return correct ? "答對了。這句你聽得很準。" : "這次不對。聽聽看正確的句子。"
}

export function roundFeedback(ratio: number): string {
  if (ratio >= 1) return "整輪都對了。耳朵很靈。"
  if (ratio >= 0.7) return "大部分都聽懂了。錯的那幾句，可以再聽一次。"
  if (ratio >= 0.4) return "已經抓到一些句子。再練一輪會更熟。"
  return "第一輪先認識這些句子就好。再聽一次，慢慢來。"
}

export function speakRoundFeedback(average: number | null): string {
  if (average === null) return "這輪先把句子聽過一遍。準備好了，再用麥克風試一次。"
  if (average >= 90) return "這輪說得很穩。可以換下一個主題。"
  if (average >= 70) return "已經說得出來了。標色的字再練一次會更清楚。"
  return "先跟著示範慢速說。清楚比快更重要。"
}
