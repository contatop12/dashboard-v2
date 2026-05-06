import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Zap, User, Bell, ChevronDown, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import AccountSwitcher from '@/components/AccountSwitcher'

export default function Header({ onMenuToggle, sidebarOpen }) {
  const { user, logout } = useAuth()

  const label =
    user?.name?.trim() || user?.email?.split('@')[0] || 'Conta'

  return (
    <header className="h-12 bg-[#0F0F0F] border-b border-surface-border flex items-center px-4 gap-3 shrink-0 z-50">
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-surface-card transition-all"
      >
        {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center shrink-0">
          <Zap size={14} className="text-[#0F0F0F]" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm text-white tracking-tight">P12</span>
          <span className="text-surface-border hidden sm:block">|</span>
          <span className="font-display font-semibold text-sm text-muted-foreground hidden sm:block">Dashboard</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-surface-card transition-all relative"
        >
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand rounded-full" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-md px-3 py-1.5 text-xs text-white hover:bg-surface-hover transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center shrink-0">
                <User size={11} className="text-[#0F0F0F]" />
              </div>
              <span className="font-sans hidden sm:inline max-w-[120px] truncate">{label}</span>
              <ChevronDown size={11} className="text-muted-foreground shrink-0" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={6}
              align="end"
              className="min-w-[240px] rounded-lg border border-surface-border bg-[#141414] py-1 shadow-xl z-[80]"
            >
              <AccountSwitcher user={user} />
              <div className="px-3 py-2 border-b border-surface-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Sessão</p>
                <p className="text-xs text-white font-sans truncate mt-0.5">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {user?.role === 'super_admin' ? 'Super admin' : 'Cliente'}
                </p>
              </div>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs text-white font-sans outline-none cursor-pointer hover:bg-surface-hover focus:bg-surface-hover"
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
