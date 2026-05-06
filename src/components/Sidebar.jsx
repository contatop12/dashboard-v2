import {
  LayoutDashboard,
  Facebook,
  Search,
  MapPin,
  Instagram,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'Geral', label: 'Geral', icon: LayoutDashboard },
  { id: 'Meta Ads', label: 'Meta Ads', icon: Facebook },
  { id: 'Google Ads', label: 'Google Ads', icon: Search },
  { id: 'Google Meu Negócio', label: 'Google Meu Negócio', icon: MapPin },
  { id: 'Instagram', label: 'Instagram', icon: Instagram },
]

export default function Sidebar({ activePage, onNavigate, open, onClose, userRole }) {
  const [collapsed, setCollapsed] = useState(false)
  const items =
    userRole === 'super_admin'
      ? [...NAV_ITEMS, { id: 'Clientes', label: 'Clientes', icon: Users }]
      : NAV_ITEMS

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-[#0D0D0D] border-r border-surface-border flex flex-col shrink-0 z-50 transition-all duration-300',
          // Desktop: collapsible
          'hidden lg:flex',
          collapsed ? 'lg:w-12' : 'lg:w-48',
          // Mobile: slide over
          open && 'fixed inset-y-0 left-0 flex w-56 shadow-xl lg:relative lg:shadow-none lg:flex'
        )}
      >
        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-0.5 pt-3 px-2">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onNavigate(id)
                  onClose?.()
                }}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-2 transition-all duration-150 group relative text-left w-full',
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-muted-foreground hover:text-white hover:bg-surface-card'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-r-full" />
                )}
                <Icon size={15} className="shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-sans font-medium truncate">{label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom: Settings + collapse */}
        <div className="px-2 pb-3 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              onNavigate('Configurações')
              onClose?.()
            }}
            title={collapsed ? 'Configurações' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-2 transition-all text-left w-full',
              activePage === 'Configurações'
                ? 'bg-brand/15 text-brand'
                : 'text-muted-foreground hover:text-white hover:bg-surface-card'
            )}
          >
            <Settings size={15} className="shrink-0" />
            {!collapsed && <span className="text-xs font-sans font-medium">Configurações</span>}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex items-center gap-2.5 rounded-md px-2 py-2 text-muted-foreground hover:text-white hover:bg-surface-card transition-all"
          >
            {collapsed ? (
              <ChevronRight size={14} />
            ) : (
              <>
                <ChevronLeft size={14} />
                <span className="text-xs font-sans">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
