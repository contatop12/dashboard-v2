import { useState, useEffect } from 'react'
import { Palette, User, Bell, Shield, Zap, Search } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { normalizeLayout } from '@/lib/dashboardGrid'
import DesignSystem from './DesignSystem'
import Conexoes from './Conexoes'
import {
  browserNotificationsSupported,
  getBrowserNotificationPermission,
  loadNotificationPrefs,
  requestBrowserNotificationPermission,
  saveNotificationPrefs,
  showBrowserNotification,
} from '@/lib/notifications'

const TABS = [
  { id: 'design', label: 'Design System', icon: Palette },
  { id: 'conta', label: 'Conta', icon: User },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'integracoes', label: 'Integrações', icon: Zap },
]

function ContaTab() {
  return (
    <div className="max-w-lg flex flex-col gap-4">
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Informações da Conta</h3>
        <div className="flex flex-col gap-4">
          {[{ label: 'Nome', value: 'Administrador' }, { label: 'Email', value: 'contato@p12digital.com.br' }, { label: 'Empresa', value: 'P12 Digital' }].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-sans">{label}</span>
              <input defaultValue={value} className="bg-surface-input border border-surface-border rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans transition-colors" />
            </div>
          ))}
          <button className="mt-2 bg-brand text-[#0F0F0F] text-xs font-semibold px-4 py-2 rounded-md hover:bg-brand/90 transition-all w-fit">Salvar Alterações</button>
        </div>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Alterar Senha</h3>
        <div className="flex flex-col gap-4">
          {['Senha Atual', 'Nova Senha', 'Confirmar Nova Senha'].map(l => (
            <div key={l} className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-sans">{l}</span>
              <input type="password" placeholder="••••••••" className="bg-surface-input border border-surface-border rounded-md px-4 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans transition-colors" />
            </div>
          ))}
          <button className="mt-2 bg-surface-card border border-surface-border text-white text-xs font-sans px-4 py-2 rounded-md hover:bg-surface-hover transition-all w-fit">Alterar Senha</button>
        </div>
      </div>
    </div>
  )
}

function NotificacoesTab() {
  const [prefs, setPrefs] = useState(() => loadNotificationPrefs())
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission())
  const supported = browserNotificationsSupported()

  const updatePref = (key, value) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    saveNotificationPrefs(next)
  }

  const enableBrowserNotifications = async () => {
    const result = await requestBrowserNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      updatePref('browserEnabled', true)
      showBrowserNotification('Notificações ativadas', {
        body: 'Você receberá alertas do P12 Dashboard neste navegador.',
        tag: 'p12-welcome',
      })
    }
  }

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <div className="rounded-xl border border-surface-border bg-surface-card p-4">
        <h3 className="mb-1 font-display text-sm font-semibold text-white">Notificações do navegador</h3>
        <p className="mb-4 font-sans text-xs text-muted-foreground">
          Receba alertas nativos do sistema (Windows, macOS, Android) mesmo com a aba em segundo plano.
        </p>
        {!supported ? (
          <p className="font-sans text-xs text-muted-foreground">Seu navegador não suporta notificações push.</p>
        ) : permission === 'denied' ? (
          <p className="font-sans text-xs text-amber-200/90">
            Permissão bloqueada. Libere notificações nas configurações do site no navegador.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (prefs.browserEnabled) {
                  updatePref('browserEnabled', false)
                  return
                }
                if (permission === 'granted') {
                  updatePref('browserEnabled', true)
                  return
                }
                void enableBrowserNotifications()
              }}
              className={`relative h-5 w-9 rounded-full transition-all ${prefs.browserEnabled ? 'bg-brand' : 'bg-surface-border'}`}
              aria-pressed={prefs.browserEnabled}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                style={{ left: prefs.browserEnabled ? '18px' : '2px' }}
              />
            </button>
            <span className="font-sans text-sm text-white">
              {prefs.browserEnabled ? 'Ativadas neste navegador' : 'Desativadas'}
            </span>
            {permission === 'default' && !prefs.browserEnabled ? (
              <button
                type="button"
                onClick={() => void enableBrowserNotifications()}
                className="rounded-md border border-brand/30 bg-brand/10 px-3 py-1.5 font-sans text-xs text-brand hover:bg-brand/20"
              >
                Permitir no navegador
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-4">
        <h3 className="mb-4 font-display text-sm font-semibold text-white">Preferências de alerta</h3>
        <div className="flex flex-col gap-4">
          {[
            { key: 'alertaConexao', label: 'Conexões OAuth', desc: 'Quando Meta, Google Ads ou GBP ficarem desconectados' },
            { key: 'alertaKPI', label: 'Alertas de KPI', desc: 'Notificação quando algum KPI sair do normal' },
            { key: 'alertaCusto', label: 'Alerta de orçamento', desc: 'Aviso quando o gasto atingir 80% do budget' },
            { key: 'novoCampanha', label: 'Nova campanha', desc: 'Notificar quando uma campanha for criada' },
            { key: 'emailDiario', label: 'Relatório diário por email', desc: 'Resumo dos KPIs principais todo dia às 8h' },
            { key: 'emailSemanal', label: 'Relatório semanal', desc: 'Comparativo semanal com métricas detalhadas' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-sans text-sm text-white">{label}</span>
                <span className="font-sans text-[11px] text-muted-foreground">{desc}</span>
              </div>
              <button
                type="button"
                onClick={() => updatePref(key, !prefs[key])}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-all ${prefs[key] ? 'bg-brand' : 'bg-surface-border'}`}
                aria-pressed={prefs[key]}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                  style={{ left: prefs[key] ? '18px' : '2px' }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdminAccountsCard() {
  const [discovering, setDiscovering] = useState(false)
  const [discoverResult, setDiscoverResult] = useState(null)
  const [accounts, setAccounts] = useState(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  useEffect(() => {
    setLoadingAccounts(true)
    fetch('/api/admin/accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAccounts(d))
      .catch(() => {})
      .finally(() => setLoadingAccounts(false))
  }, [discoverResult])

  async function handleDiscover() {
    setDiscovering(true)
    try {
      const r = await fetch('/api/admin/accounts/discover', {
        method: 'POST',
        credentials: 'include',
      })
      if (r.ok) setDiscoverResult(await r.json())
    } catch {
      // silent
    } finally {
      setDiscovering(false)
    }
  }

  const LABELS = {
    meta_ads: 'Meta Ads',
    instagram: 'Instagram',
    google_ads: 'Google Ads',
    google_business: 'Google Meu Negócio',
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-white text-sm">Contas da empresa (BM)</h3>
        <button
          type="button"
          onClick={handleDiscover}
          disabled={discovering}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 disabled:opacity-50 font-sans transition-colors"
        >
          <Search size={12} />
          {discovering ? 'A descobrir…' : 'Descobrir contas'}
        </button>
      </div>

      {discoverResult && (
        <p className="text-xs text-brand font-sans bg-brand/5 border border-brand/20 rounded-md px-3 py-2">
          Meta Ads: <strong>{discoverResult.meta_ads}</strong> · Instagram:{' '}
          <strong>{discoverResult.instagram}</strong> · Google Ads:{' '}
          <strong>{discoverResult.google_ads}</strong> · Google Meu Negócio:{' '}
          <strong>{discoverResult.google_business}</strong>
        </p>
      )}

      {loadingAccounts ? (
        <p className="text-xs text-muted-foreground font-sans">A carregar…</p>
      ) : accounts ? (
        <div className="flex flex-col gap-3">
          {Object.entries(LABELS).map(([key, label]) => {
            const rows = accounts[key] ?? []
            if (rows.length === 0) return null
            return (
              <div key={key}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-sans mb-1">
                  {label} ({rows.length})
                </p>
                <ul className="flex flex-col gap-0.5 max-h-28 overflow-y-auto">
                  {rows.map((row) => (
                    <li key={row.id} className="text-[11px] text-white/80 font-sans truncate">
                      {row.external_name || row.external_id}
                      <span className="ml-1 text-muted-foreground/60">({row.external_id})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('design')
  const { theme } = useTheme()
  const { user } = useAuth()
  const L = normalizeLayout(theme.layout)

  useEffect(() => {
    try {
      const tab = sessionStorage.getItem('p12_settings_tab')
      if (tab) {
        setActiveTab(tab)
        sessionStorage.removeItem('p12_settings_tab')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const contentPad = {
    paddingTop: L.marginTop,
    paddingRight: L.marginRight,
    paddingBottom: L.marginBottom,
    paddingLeft: L.marginLeft,
  }

  return (
    <div
      className="animate-fade-in box-border min-h-0 min-w-0 max-w-full"
      style={contentPad}
    >
      <div className="flex gap-8">
        {/* Side nav */}
        <div className="w-44 shrink-0">
          <nav className="flex flex-col gap-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-left text-sm font-sans transition-all ${activeTab === id ? 'bg-brand/15 text-brand' : 'text-muted-foreground hover:text-white hover:bg-surface-card'}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeTab === 'design' && <DesignSystem />}
          {activeTab === 'conta' && <ContaTab />}
          {activeTab === 'notificacoes' && <NotificacoesTab />}
          {activeTab === 'integracoes' && <Conexoes />}
          {activeTab === 'permissoes' && (
            <div className="max-w-lg flex flex-col gap-4">
              <div className="rounded-xl border border-surface-border bg-surface-card p-4">
                <h3 className="mb-2 font-display text-sm font-semibold text-white">Gerenciamento de Usuários</h3>
                <p className="font-sans text-xs text-muted-foreground">Super Admin — módulo de atribuição de contas por usuário em desenvolvimento.</p>
                <div className="mt-4 rounded-lg border border-brand/20 bg-brand/10 p-4">
                  <p className="font-sans text-xs text-brand">Em breve: atribua contas (Meta Ads, Google Ads) a usuários específicos. Cada usuário verá apenas os dados das contas autorizadas.</p>
                </div>
              </div>
              {user?.role === 'super_admin' && <AdminAccountsCard />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
