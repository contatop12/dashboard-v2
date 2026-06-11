import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Zap, User, ChevronDown, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import AccountSwitcher from '@/components/AccountSwitcher'
import NotificationBell from '@/components/NotificationBell'

export default function Header({ onMenuToggle, sidebarOpen }) {
  const { user, logout } = useAuth()
  const { orgs, activeOrgId, setActiveOrgId, loading: loadingOrgs } = useOrgWorkspace()

  const label = user?.name?.trim() || user?.email?.split('@')[0] || 'Conta'

  const openNotificationSettings = () => {
    try {
      sessionStorage.setItem('p12_settings_tab', 'notificacoes')
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('p12-navigate', { detail: { page: 'Configurações' } }))
  }

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#0F0F0F] px-4 z-50">
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-surface-card hover:text-white lg:hidden"
      >
        {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand">
          <Zap size={14} className="text-[#0F0F0F]" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold tracking-tight text-white">P12</span>
          <span className="hidden text-surface-border sm:block">|</span>
          <span className="hidden font-display text-sm font-semibold text-muted-foreground sm:block">Dashboard</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {!loadingOrgs && user?.role === 'client' && orgs.length > 1 && (
          <select
            value={activeOrgId ?? ''}
            onChange={(e) => setActiveOrgId(e.target.value || null)}
            className="hidden h-8 max-w-[208px] cursor-pointer rounded-md border border-surface-border bg-surface-input px-2 font-sans text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40 lg:block"
            title="Organização"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <NotificationBell onOpenSettings={openNotificationSettings} />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-2 rounded-md border border-surface-border bg-surface-card px-3 text-xs text-white transition-all outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                <User size={12} className="text-[#0F0F0F]" />
              </div>
              <span className="hidden max-w-[120px] truncate font-sans sm:inline">{label}</span>
              <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="end"
              className="z-[80] min-w-[240px] rounded-lg border border-surface-border bg-[#141414] py-2 shadow-xl"
            >
              <AccountSwitcher user={user} />
              <div className="border-b border-surface-border px-4 py-2">
                <p className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">Sessão</p>
                <p className="mt-0.5 truncate font-sans text-xs text-white">{user?.email}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {user?.role === 'super_admin' ? 'Super admin' : 'Cliente'}
                </p>
              </div>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 px-4 py-2 font-sans text-xs text-white outline-none hover:bg-surface-hover focus:bg-surface-hover"
                onSelect={(e) => {
                  e.preventDefault()
                  logout()
                }}
              >
                <LogOut size={14} className="text-muted-foreground" />
                Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
