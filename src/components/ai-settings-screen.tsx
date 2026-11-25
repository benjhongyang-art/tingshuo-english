import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { BackHeader } from "@/components/practice-shell.tsx"
import { Button } from "@/components/ui/button.tsx"
import { Input } from "@/components/ui/input.tsx"
import { OPENAI_BASE_URL, OPENAI_MODEL } from "@/lib/ai-client.ts"
import {
  defaultAiSettings,
  hasApiKey,
  isAiProvider,
  loadAiSettings,
  maskApiKey,
  normalizeAiDraft,
  saveAiSettings,
  withoutApiKey,
  type AiDraft,
  type AiProvider,
} from "@/lib/ai-settings.ts"

export function AiSettingsScreen() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<AiDraft>(() => {
    const saved = loadAiSettings()
    return { provider: saved.provider, baseUrl: saved.baseUrl, model: saved.model, apiKey: "" }
  })
  const [storedKey, setStoredKey] = useState(() => loadAiSettings().apiKey)
  const [showKey, setShowKey] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = "對話設定 — 聽說"
  }, [])

  function chooseProvider(provider: AiProvider) {
    setDraft((prev) => {
      if (provider === "openai") {
        return {
          ...prev,
          provider,
          baseUrl: prev.baseUrl.trim() || OPENAI_BASE_URL,
          model: prev.model.trim() || OPENAI_MODEL,
        }
      }
      return { ...prev, provider }
    })
    setError("")
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const existing = loadAiSettings()
    const nextKey = draft.apiKey.trim() ? draft.apiKey.trim() : existing.apiKey
    const result = normalizeAiDraft(
      { ...draft, apiKey: nextKey },
      {
        level: existing.level,
        scenarioId: existing.scenarioId,
        showHint: existing.showHint,
        autoSpeak: existing.autoSpeak,
      },
    )
    if (!result.ok) {
      setError(result.message)
      setMessage("")
      return
    }
    saveAiSettings(result.settings)
    setStoredKey(result.settings.apiKey)
    setDraft({
      provider: result.settings.provider,
      baseUrl: result.settings.baseUrl,
      model: result.settings.model,
      apiKey: "",
    })
    setShowKey(false)
    setError("")
    setMessage(
      hasApiKey(result.settings)
        ? "已儲存在這台瀏覽器。金鑰不會上傳。"
        : "已儲存網址和模型。還沒有金鑰，對話前要先貼上。",
    )
  }

  function clearKey() {
    const current = loadAiSettings()
    saveAiSettings(withoutApiKey(current))
    setStoredKey("")
    setDraft((prev) => ({ ...prev, apiKey: "" }))
    setError("")
    setMessage("已清除這台瀏覽器裡的金鑰。")
  }

  const masked = maskApiKey(storedKey)
  const defaults = defaultAiSettings()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <BackHeader title="對話設定" detail="API 金鑰" to="/chat" />

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950" role="note">
        <p className="font-semibold">金鑰只留在這台瀏覽器</p>
        <p className="mt-1">
          聽說是靜態網站，沒有後端。API 金鑰只存在這台瀏覽器的 localStorage，不會上傳，也不會寫進專案。對話由你的瀏覽器直接呼叫
          API，費用會計入你自己的帳戶。
        </p>
        <p className="mt-2">請不要在公用電腦上儲存金鑰。清除這個網站的資料，或按「清除金鑰」，就會把它刪掉。</p>
      </div>

      <form className="mt-4 rounded-[1.6rem] border bg-card p-4 shadow-sm" onSubmit={save} autoComplete="off">
        <label className="block text-sm font-medium" htmlFor="ai-provider">
          服務
        </label>
        <select
          id="ai-provider"
          className="mt-2 h-12 w-full rounded-lg border border-input bg-card px-3 text-base"
          value={draft.provider}
          onChange={(event) => {
            if (isAiProvider(event.target.value)) chooseProvider(event.target.value)
          }}
        >
          <option value="openai">OpenAI</option>
          <option value="compatible">OpenAI 相容服務</option>
        </select>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {draft.provider === "openai"
            ? "OpenAI 允許從瀏覽器直接呼叫。預設模型是 gpt-4o-mini，可以改成你帳戶裡有的模型。"
            : "請填該服務的網址和模型，並確認它允許瀏覽器跨網域請求。"}
        </p>

        <label className="mt-4 block text-sm font-medium" htmlFor="ai-base-url">
          API 網址
        </label>
        <Input
          id="ai-base-url"
          value={draft.baseUrl}
          onChange={(event) => setDraft((prev) => ({ ...prev, baseUrl: event.target.value }))}
          placeholder={defaults.baseUrl}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 h-12 bg-background px-3 text-base md:text-base"
        />
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          結尾的 /chat/completions 可以省略。OpenAI 是 {OPENAI_BASE_URL}。
        </p>

        <label className="mt-4 block text-sm font-medium" htmlFor="ai-model">
          模型
        </label>
        <Input
          id="ai-model"
          value={draft.model}
          onChange={(event) => setDraft((prev) => ({ ...prev, model: event.target.value }))}
          placeholder={OPENAI_MODEL}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="mt-2 h-12 bg-background px-3 text-base md:text-base"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="ai-key">
          API 金鑰
        </label>
        <div className="mt-2 flex gap-2">
          <Input
            id="ai-key"
            type={showKey ? "text" : "password"}
            value={draft.apiKey}
            onChange={(event) => setDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
            placeholder={masked ? "留空表示沿用已儲存的金鑰" : "貼上你的 API 金鑰"}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="h-12 bg-background px-3 text-base md:text-base"
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 shrink-0 bg-card px-3"
            onClick={() => setShowKey((prev) => !prev)}
            aria-pressed={showKey}
          >
            {showKey ? "隱藏" : "顯示"}
          </Button>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {masked ? `這台瀏覽器已有金鑰（${masked}）。要換一把，貼上新的再儲存。` : "還沒有儲存金鑰。"}
        </p>

        {error && (
          <p className="mt-3 text-sm text-speak" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-3 text-sm text-good" role="status">
            {message}
          </p>
        )}

        <Button type="submit" className="mt-4 h-12 w-full text-base">
          儲存在這台瀏覽器
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-12 w-full bg-card text-base"
          onClick={clearKey}
          disabled={!storedKey && !draft.apiKey}
        >
          清除金鑰
        </Button>
      </form>

      <Button type="button" variant="ghost" className="mt-4 h-11 text-base" onClick={() => navigate("/chat")}>
        回到對話
      </Button>
    </div>
  )
}
