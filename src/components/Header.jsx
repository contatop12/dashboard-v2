import { useEffect, useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Zap, User, Bell, ChevronDown, Menu, X, LogOut, Activity } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import AccountSwitcher from '@/components/AccountSwitcher'

export default function Header({ onMenuToggle, sidebarOpen }) {
  const { user, logout } = useAuth()
  const { orgs, activeOrgId, setActiveOrgId, loading: loadingOrgs } = useOrgWorkspace()
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [monitorLoading, setMonitorLoading] = useState(false)
  const [monitorError, setMonitorError] = useState('')
  const [monitorStatus, setMonitorStatus] = useState([])
  const [lastCheckedAt, setLastCheckedAt] = useState(null)

  const label =
    user?.name?.trim() || user?.email?.split('@')[0] || 'Conta'

  const sourceMode = useMemo(() => {
    if (user?.role !== 'super_admin') return 'oauth'
    return activeOrgId ? 'oauth' : 'worker'
  }, [user?.role, activeOrgId])

  const hasIssues = monitorStatus.some((s) => !s.ok)
  const workerSecretsMode = user?.role === 'super_admin' && !activeOrgId

  useEffect(() => {
    if (!monitorOpen) return
    let cancelled = false
    const run = async () => {
      setMonitorLoading(true)
      setMonitorError('')
      try {
        if (activeOrgId) {
          const r = await fetch(`/api/orgs/${activeOrgId}/connections`, { credentials: 'include' })
          if (!r.ok) throw new Error('Não foi possível verificar conexões OAuth.')
          const data = await r.json()
          const rows = data.connections ?? []
          const providers = [
            ['meta_ads', 'Meta Ads'],
            ['instagram', 'Instagram'],
            ['google_ads', 'Google Ads'],
            ['google_business', 'Google Meu Negócio'],
          ]
          const next = providers.map(([provider, name]) => {
            const qtd = rows.filter((row) => row.provider === provider).length
            return {
              id: provider,
              label: name,
              ok: qtd > 0,
              detail: qtd > 0 ? `${qtd} conta(s) conectada(s)` : 'Sem conexão OAuth',
            }
          })
          if (!cancelled) setMonitorStatus(next)
        } else {
          const checks = [
            ['meta', 'Meta Ads', '/api/admin/platform/meta-overview'],
            ['instagram', 'Instagram', '/api/admin/platform/instagram-overview'],
            ['google_ads', 'Google Ads', '/api/admin/platform/google-ads-overview'],
            ['google_business', 'Google Meu Negócio', '/api/admin/platform/google-business-overview'],
          ]
          const results = await Promise.all(
            checks.map(async ([id, labelName, endpoint]) => {
              try {
                const r = await fetch(endpoint, { credentials: 'include' })
                return {
                  id,
                  label: labelName,
                  ok: r.ok,
                  detail: r.ok ? 'Worker/secrets respondendo' : 'Falha ao validar secrets',
                }
              } catch {
                return {
                  id,
                  label: labelName,
                  ok: false,
                  detail: 'Falha ao validar secrets',
                }
              }
            })
          )
          if (!cancelled) setMonitorStatus(results)
        }
        if (!cancelled) setLastCheckedAt(new Date())
      } catch (e) {
        if (!cancelled) {
          setMonitorStatus([])
          setMonitorError(e instanceof Error ? e.message : 'Erro ao carregar monitoramento')
        }
      } finally {
        if (!cancelled) setMonitorLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [monitorOpen, activeOrgId])

  return (
    <header className="h-12 bg-[#0F0F0F] border-b border-surface-border flex items-center px-4 gap-4 shrink-0 z-50">
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-surface-card transition-all"
      >
        {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
      </button>

      <div className="flex items-center gap-2">
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
        {!loadingOrgs && user?.role === 'super_admin' && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            <select
              value={activeOrgId ?? ''}
              onChange={(e) => setActiveOrgId(e.target.value || null)}
              className="max-w-[192px] cursor-pointer rounded-md border border-surface-border bg-surface-input py-2 px-2 text-[10px] text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              title="Escolha a conta/cliente"
            >
              <option value="">Conta do cliente…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              value={sourceMode}
              onChange={(e) => {
                const next = e.target.value
                if (next === 'worker') {
                  setActiveOrgId(null)
                  return
                }
                if (!activeOrgId && orgs[0]?.id) {
                  setActiveOrgId(orgs[0].id)
                }
              }}
              className="cursor-pointer rounded-md border border-surface-border bg-surface-input py-2 px-2 text-[10px] text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              title="Fonte de conexão"
            >
              <option value="oauth">OAuth</option>
              <option value="worker">Secrets (.env)</option>
            </select>
          </div>
        )}

        {!loadingOrgs && user?.role === 'client' && orgs.length > 1 && (
          <select
            value={activeOrgId ?? ''}
            onChange={(e) => setActiveOrgId(e.target.value || null)}
            className="hidden lg:block max-w-[208px] cursor-pointer rounded-md border border-surface-border bg-surface-input py-2 px-2 text-[10px] text-white font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            title="Escolha a conta/cliente"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}

        <DropdownMenu.Root open={monitorOpen} onOpenChange={setMonitorOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-surface-card transition-all relative"
              title={
                workerSecretsMode
                  ? 'Status e dicas — modo Secrets (.env); abra para ver como usar OAuth e filtros vivos'
                  : 'Monitoramento de conexões'
              }
            >
              <Activity size={14} />
              <span
                className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                  hasIssues ? 'bg-red-400' : workerSecretsMode ? 'bg-amber-400' : 'bg-green-400'
                }`}
              />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={8}
              align="end"
              className="w-[320px] rounded-lg border border-surface-border bg-[#141414] py-2 shadow-xl z-[80]"
            >
              <div className="px-4 pb-2 border-b border-surface-border">
                <p className="text-[11px] text-white font-semibold font-sans">Status de monitoramento</p>
                <p className="text-[10px] text-muted-foreground font-sans mt-0.5">
                  Fonte: {activeOrgId ? 'OAuth (organização)' : 'Secrets (.env / Worker)'}
                </p>
              </div>

              {workerSecretsMode && (
                <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2">
                  <p className="font-sans text-[10px] leading-snug text-amber-100/95">
                    Modo <span className="font-semibold">Secrets (.env)</span>: selecione uma organização no topo para
                    OAuth, filtros vivos da Meta e contas por canal.
                  </p>
                </div>
              )}

              <div className="px-4 py-2">
                {monitorLoading && <p className="text-xs text-muted-foreground font-sans">Verificando conexões...</p>}
                {!monitorLoading && monitorError && (
                  <p className="text-xs text-red-400 font-sans">{monitorError}</p>
                )}
                {!monitorLoading && !monitorError && monitorStatus.length === 0 && (
                  <p className="text-xs text-muted-foreground font-sans">Sem dados de conexão.</p>
                )}
                {!monitorLoading && !monitorError && monitorStatus.length > 0 && (
                  <div className="space-y-2">
                    {monitorStatus.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-white font-sans truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground font-sans">{item.detail}</p>
                        </div>
                        <span className={`text-[10px] font-mono ${item.ok ? 'text-green-400' : 'text-red-400'}`}>
                          {item.ok ? 'OK' : 'ERRO'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 pt-2 border-t border-surface-border">
                <p className="text-[10px] text-muted-foreground font-sans">
                  {hasIssues ? 'Há conexões com erro.' : 'Todas as conexões verificadas estão ok.'}
                </p>
                {lastCheckedAt && (
                  <p className="text-[10px] text-muted-foreground/80 font-sans mt-0.5">
                    Atualizado às {lastCheckedAt.toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

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
              className="flex items-center gap-2 bg-surface-card border border-surface-border rounded-md px-4 py-2 text-xs text-white hover:bg-surface-hover transition-all outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
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
              sideOffset={8}
              align="end"
              className="min-w-[240px] rounded-lg border border-surface-border bg-[#141414] py-2 shadow-xl z-[80]"
            >
              <AccountSwitcher user={user} />
              <div className="px-4 py-2 border-b border-surface-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans">Sessão</p>
                <p className="text-xs text-white font-sans truncate mt-0.5">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {user?.role === 'super_admin' ? 'Super admin' : 'Cliente'}
                </p>
              </div>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-4 py-2 text-xs text-white font-sans outline-none cursor-pointer hover:bg-surface-hover focus:bg-surface-hover"
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
