import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "@/components/ui/button.tsx"

export function UpdateBanner() {
  if (!import.meta.env.PROD) return null
  return <ProductionUpdateBanner />
}

function ProductionUpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      window.setInterval(() => {
        void registration.update().catch(() => {
          // Offline checks can fail; the next visit tries again.
        })
      }, 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border bg-card p-4 shadow-lg">
        <p className="min-w-0 flex-1 text-sm leading-6">有新版本。更新後才會用到最新的練習內容，不會一直停在舊版。</p>
        <Button type="button" className="h-11 shrink-0 px-3 text-base" onClick={() => void updateServiceWorker(true)}>
          立即更新
        </Button>
      </div>
    </div>
  )
}
