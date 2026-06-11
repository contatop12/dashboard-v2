import { useCallback, useEffect, useRef, useState } from 'react'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import {
  addNotification,
  loadConnectionSnapshot,
  loadNotificationInbox,
  loadNotificationPrefs,
  markAllNotificationsRead,
  markNotificationRead,
  saveConnectionSnapshot,
  showBrowserNotification,
  unreadNotificationCount,
} from '@/lib/notifications'

const PROVIDERS = [
  ['meta_ads', 'Meta Ads'],
  ['instagram', 'Instagram'],
  ['google_ads', 'Google Ads'],
  ['google_business', 'Google Meu Negócio'],
]

async function fetchConnectionStatus(activeOrgId) {
  if (!activeOrgId) return []

  const r = await fetch(`/api/orgs/${activeOrgId}/connections`, { credentials: 'include' })
  if (!r.ok) throw new Error('Não foi possível verificar conexões OAuth.')
  const data = await r.json()
  const rows = data.connections ?? []

  return PROVIDERS.map(([provider, label]) => {
    const qtd = rows.filter((row) => row.provider === provider).length
    return {
      id: provider,
      label,
      ok: qtd > 0,
      detail: qtd > 0 ? `${qtd} conta(s) conectada(s)` : 'Sem conexão OAuth',
    }
  })
}

function pushConnectionAlerts(statusList, prefs, notifyBrowser) {
  const prev = loadConnectionSnapshot()
  const isFirstRun = Object.keys(prev).length === 0
  const next = {}
  let inbox = loadNotificationInbox()

  for (const item of statusList) {
    next[item.id] = item.ok
    if (isFirstRun) continue

    const wasOk = prev[item.id]
    const isNewFailure = item.ok === false && wasOk === true

    if (!prefs.alertaConexao || !isNewFailure) continue

    const { inbox: updated } = addNotification({
      type: 'connection',
      title: `${item.label} desconectado`,
      body: item.detail,
    })
    inbox = updated

    if (prefs.browserEnabled && notifyBrowser) {
      showBrowserNotification(`${item.label} desconectado`, {
        body: item.detail,
        tag: `connection-${item.id}`,
      })
    }
  }

  saveConnectionSnapshot(next)
  return inbox
}

export function useDashboardNotifications() {
  const { activeOrgId } = useOrgWorkspace()
  const [inbox, setInbox] = useState(() => loadNotificationInbox())
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState([])
  const checkingRef = useRef(false)

  const unread = unreadNotificationCount(inbox)

  const runCheck = useCallback(async () => {
    if (!activeOrgId || checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    setCheckError('')
    try {
      const statusList = await fetchConnectionStatus(activeOrgId)
      setConnectionStatus(statusList)
      const prefs = loadNotificationPrefs()
      const updatedInbox = pushConnectionAlerts(statusList, prefs, true)
      setInbox(updatedInbox)
    } catch (e) {
      setCheckError(e instanceof Error ? e.message : 'Erro ao verificar conexões')
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }, [activeOrgId])

  useEffect(() => {
    setInbox(loadNotificationInbox())
  }, [])

  useEffect(() => {
    if (!activeOrgId) {
      setConnectionStatus([])
      return
    }
    void runCheck()
    const id = window.setInterval(() => void runCheck(), 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [activeOrgId, runCheck])

  const refresh = useCallback(() => {
    void runCheck()
    setInbox(loadNotificationInbox())
  }, [runCheck])

  const readOne = useCallback((id) => {
    setInbox(markNotificationRead(id))
  }, [])

  const readAll = useCallback(() => {
    setInbox(markAllNotificationsRead())
  }, [])

  return {
    inbox,
    unread,
    checking,
    checkError,
    connectionStatus,
    refresh,
    readOne,
    readAll,
  }
}
