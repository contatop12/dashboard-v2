import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, CheckCheck, RefreshCw, Settings } from 'lucide-react'
import { useDashboardNotifications } from '@/hooks/useDashboardNotifications'
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  loadNotificationPrefs,
} from '@/lib/notifications'

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function NotificationBell({ onOpenSettings }) {
  const [open, setOpen] = useState(false)
  const { inbox, unread, checking, checkError, connectionStatus, refresh, readOne, readAll } =
    useDashboardNotifications()
  const prefs = loadNotificationPrefs()
  const permission = getBrowserNotificationPermission()
  const browserReady = browserNotificationsSupported() && permission === 'granted' && prefs.browserEnabled

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) refresh()
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-card hover:text-white"
          title="Notificações"
          aria-label={`Notificações${unread > 0 ? `, ${unread} não lidas` : ''}`}
        >
          <Bell size={16} />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-[#0F0F0F]">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="z-[80] w-[340px] rounded-lg border border-surface-border bg-[#141414] py-2 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-surface-border px-4 pb-2">
            <div>
              <p className="font-sans text-[11px] font-semibold text-white">Notificações</p>
              <p className="mt-0.5 font-sans text-[10px] text-muted-foreground">
                {browserReady ? 'Navegador ativo' : 'Alertas dentro do dashboard'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => refresh()}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-white"
                title="Atualizar"
              >
                <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
              </button>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={() => readAll()}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-white"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={13} />
                </button>
              ) : null}
            </div>
          </div>

          {connectionStatus.length > 0 && (
            <div className="border-b border-surface-border px-4 py-2">
              <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
                Conexões OAuth
              </p>
              <div className="space-y-1.5">
                {connectionStatus.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-sans text-[11px] text-white">{item.label}</p>
                      <p className="font-sans text-[10px] text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className={`shrink-0 font-mono text-[10px] ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {item.ok ? 'OK' : 'ERRO'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto px-2 py-1">
            {checkError ? (
              <p className="px-2 py-2 font-sans text-xs text-red-400">{checkError}</p>
            ) : null}
            {checking && inbox.length === 0 ? (
              <p className="px-2 py-3 font-sans text-xs text-muted-foreground">Verificando…</p>
            ) : null}
            {!checking && inbox.length === 0 ? (
              <p className="px-2 py-6 text-center font-sans text-xs text-muted-foreground">
                Nenhuma notificação por enquanto.
              </p>
            ) : (
              inbox.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => readOne(item.id)}
                  className={`mb-1 w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-hover ${
                    item.read ? 'opacity-70' : 'bg-brand/5'
                  }`}
                >
                  <p className="font-sans text-xs font-medium text-white">{item.title}</p>
                  {item.body ? (
                    <p className="mt-0.5 font-sans text-[10px] leading-snug text-muted-foreground">{item.body}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-[9px] text-muted-foreground/80">{formatWhen(item.createdAt)}</p>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-surface-border px-4 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenSettings?.()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 font-sans text-[11px] text-muted-foreground transition-colors hover:text-white"
            >
              <Settings size={12} />
              Preferências de notificação
            </button>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
