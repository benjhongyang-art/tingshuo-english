const DB_NAME = "tingshuo-reminder"
const STORE = "config"

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function readConfig() {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        const tx = db.transaction(STORE, "readonly")
        const request = tx.objectStore(STORE).get("config")
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => resolve(null)
      }),
    () => null,
  )
}

function writeConfig(config) {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(config, "config")
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      }),
    () => undefined,
  )
}

function todayString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

async function registerPeriodic() {
  if (!self.registration.periodicSync) return
  try {
    await self.registration.periodicSync.register("tingshuo-reminder", { minInterval: 60 * 60 * 1000 })
  } catch {
    // The page explains that background reminders are not available everywhere.
  }
}

async function maybeNotify() {
  const config = await readConfig()
  if (!config || config.enabled !== true) return
  const now = new Date()
  const today = todayString(now)
  if (config.lastNotifiedDay === today) return
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(config.time || "")
  if (!match) return
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const target = Number(match[1]) * 60 + Number(match[2])
  if (nowMinutes < target) return
  await self.registration.showNotification("聽說", {
    body: "今天的英文練習時間到了。打開聽說，練一點就好。",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "tingshuo-daily",
    lang: "zh-Hant",
  })
  await writeConfig({ ...config, lastNotifiedDay: today })
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  for (const client of clients) client.postMessage({ type: "tingshuo-reminder-fired", day: today })
}

self.addEventListener("message", (event) => {
  const data = event.data
  if (!data || typeof data !== "object") return
  if (data.type === "tingshuo-reminder-config") {
    event.waitUntil(
      writeConfig({
        enabled: data.enabled === true,
        time: typeof data.time === "string" ? data.time : "20:00",
        lastNotifiedDay: typeof data.lastNotifiedDay === "string" ? data.lastNotifiedDay : null,
      }).then(() => {
        if (data.enabled === true) return registerPeriodic()
      }),
    )
  }
  if (data.type === "tingshuo-reminder-sync" && event.ports[0]) {
    const port = event.ports[0]
    event.waitUntil(
      readConfig().then((config) => {
        port.postMessage({ lastNotifiedDay: config && config.lastNotifiedDay ? config.lastNotifiedDay : null })
      }),
    )
  }
})

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "tingshuo-reminder") return
  event.waitUntil(maybeNotify())
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow("./")
      return undefined
    }),
  )
})
