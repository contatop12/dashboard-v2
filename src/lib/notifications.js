const PREFS_KEY = 'p12_notification_prefs'
const INBOX_KEY = 'p12_notification_inbox'
const CONNECTION_STATUS_KEY = 'p12_notification_connection_snapshot'
const MAX_INBOX = 50

export const DEFAULT_NOTIFICATION_PREFS = {
  browserEnabled: false,
  alertaConexao: true,
  alertaKPI: true,
  emailDiario: true,
  emailSemanal: false,
  alertaCusto: true,
  novoCampanha: false,
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

export function loadNotificationPrefs() {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...readJson(PREFS_KEY, {}) }
}

export function saveNotificationPrefs(prefs) {
  writeJson(PREFS_KEY, prefs)
}

export function loadNotificationInbox() {
  const list = readJson(INBOX_KEY, [])
  return Array.isArray(list) ? list : []
}

export function saveNotificationInbox(inbox) {
  writeJson(INBOX_KEY, inbox.slice(0, MAX_INBOX))
}

export function addNotification(entry) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    read: false,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  const inbox = [item, ...loadNotificationInbox()].slice(0, MAX_INBOX)
  saveNotificationInbox(inbox)
  return { item, inbox }
}

export function markNotificationRead(id) {
  const inbox = loadNotificationInbox().map((n) => (n.id === id ? { ...n, read: true } : n))
  saveNotificationInbox(inbox)
  return inbox
}

export function markAllNotificationsRead() {
  const inbox = loadNotificationInbox().map((n) => ({ ...n, read: true }))
  saveNotificationInbox(inbox)
  return inbox
}

export function unreadNotificationCount(inbox = loadNotificationInbox()) {
  return inbox.filter((n) => !n.read).length
}

export function loadConnectionSnapshot() {
  return readJson(CONNECTION_STATUS_KEY, {})
}

export function saveConnectionSnapshot(snapshot) {
  writeJson(CONNECTION_STATUS_KEY, snapshot)
}

export function browserNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getBrowserNotificationPermission() {
  if (!browserNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestBrowserNotificationPermission() {
  if (!browserNotificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function showBrowserNotification(title, options = {}) {
  if (!browserNotificationsSupported()) return null
  if (Notification.permission !== 'granted') return null
  try {
    const n = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      lang: 'pt-BR',
      ...options,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
    return n
  } catch {
    return null
  }
}
