import { describe, expect, it, beforeEach } from 'vitest'
import {
  addNotification,
  loadNotificationInbox,
  loadNotificationPrefs,
  markAllNotificationsRead,
  saveNotificationPrefs,
  unreadNotificationCount,
} from './notifications'

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persiste preferências', () => {
    saveNotificationPrefs({ browserEnabled: true, alertaConexao: false })
    expect(loadNotificationPrefs().browserEnabled).toBe(true)
    expect(loadNotificationPrefs().alertaConexao).toBe(false)
  })

  it('adiciona e marca notificações', () => {
    addNotification({ title: 'Teste', body: 'Corpo' })
    expect(unreadNotificationCount()).toBe(1)
    markAllNotificationsRead()
    expect(unreadNotificationCount()).toBe(0)
    expect(loadNotificationInbox()[0].read).toBe(true)
  })
})
