import type { NotificationPermissionState } from "./goals.ts"

export function notificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported"
  if (Notification.permission === "granted" || Notification.permission === "denied" || Notification.permission === "default") {
    return Notification.permission
  }
  return "unsupported"
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof Notification === "undefined") return "unsupported"
  try {
    const result = await Notification.requestPermission()
    if (result === "granted" || result === "denied" || result === "default") return result
    return "unsupported"
  } catch {
    return notificationPermission() === "unsupported" ? "unsupported" : "denied"
  }
}

export async function showDailyNotification(): Promise<boolean> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false
  const title = "聽說"
  const options: NotificationOptions = {
    body: "今天的英文練習時間到了。打開聽說，練一點就好。",
    tag: "tingshuo-daily",
    lang: "zh-Hant",
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
  }
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return true
      }
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

type PeriodicSyncManager = {
  register: (tag: string, options?: { minInterval?: number }) => Promise<void>
}

export async function syncReminderWorker(config: {
  enabled: boolean
  time: string
  lastNotifiedDay: string | null
}): Promise<void> {
  if (!("serviceWorker" in navigator)) return
  try {
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({ type: "tingshuo-reminder-config", ...config })
    if (!config.enabled) return
    const periodic = (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncManager }).periodicSync
    if (!periodic) return
    const permissions = navigator.permissions
    if (!permissions?.query) return
    const status = await permissions.query({ name: "periodic-background-sync" as PermissionName })
    if (status.state !== "granted") return
    await periodic.register("tingshuo-reminder", { minInterval: 60 * 60 * 1000 })
  } catch {
    // Background sync is optional. The open app still reminds on a timer.
  }
}
