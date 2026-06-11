import { useEffect, useState } from 'react'
import { Printer, X } from 'lucide-react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'

import DashboardGrid from './components/DashboardGrid'
import { GERAL_DASHBOARD_BLOCKS } from './dashboard/geralBlocks'
import { useAuth } from './context/AuthContext'
import { DashboardFiltersProvider, useDashboardFilters } from './context/DashboardFiltersContext'

// Pages
import MetaAds from './pages/MetaAds'
import GoogleAds from './pages/GoogleAds'
import GoogleMeuNegocio from './pages/GoogleMeuNegocio'
import InstagramPage from './pages/Instagram'
import Configuracoes from './pages/Configuracoes'
import Clientes from './pages/Clientes'

function GeralPage() {
  return <DashboardGrid definitions={GERAL_DASHBOARD_BLOCKS} className="min-h-full" />
}

function Splash({ message = 'Carregando sessão…' }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4 px-4">
      <div className="w-9 h-9 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground font-sans text-center">{message}</p>
    </div>
  )
}

export default function App() {
  const { user, loading, accessError } = useAuth()
  const [activePage, setActivePage] = useState('Geral')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user?.role !== 'super_admin' && activePage === 'Clientes') {
      setActivePage('Geral')
    }
  }, [user, activePage])

  useEffect(() => {
    if (!user) return
    const sp = new URLSearchParams(window.location.search)
    const ok = sp.get('oauth_ok')
    const oauthErr = sp.get('oauth_error')
    if (!ok && !oauthErr) return
    if (ok === '1') {
      window.history.replaceState({}, '', window.location.pathname || '/')
    }
    if (oauthErr === '1') {
      const m = sp.get('oauth_msg')
      window.alert(m ? decodeURIComponent(m) : 'Não foi possível conectar a conta.')
      window.history.replaceState({}, '', window.location.pathname || '/')
    }
  }, [user])

  const PAGE_COMPONENTS = {
    Geral: GeralPage,
    'Meta Ads': MetaAds,
    'Google Ads': GoogleAds,
    'Google Meu Negócio': GoogleMeuNegocio,
    Instagram: InstagramPage,
    Configurações: Configuracoes,
    Clientes,
  }

  if (loading || !user) {
    if (!loading && accessError) {
      return <Splash message={accessError} />
    }
    return <Splash message={loading ? 'Carregando sessão…' : 'Redirecionando para Cloudflare Access…'} />
  }

  const effectivePage =
    activePage === 'Clientes' && user.role !== 'super_admin' ? 'Geral' : activePage

  const PageComponent = PAGE_COMPONENTS[effectivePage] ?? GeralPage
  const showFilterBar = effectivePage !== 'Configurações' && effectivePage !== 'Clientes'

  return (
    <DashboardFiltersProvider>
      <AppShell
        user={user}
        effectivePage={effectivePage}
        PageComponent={PageComponent}
        showFilterBar={showFilterBar}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onNavigate={(page) => {
          setActivePage(page)
          setSidebarOpen(false)
        }}
      />
    </DashboardFiltersProvider>
  )
}

function PresentationToolbar({ onExit }) {
  return (
    <div className="presentation-toolbar fixed right-4 top-3 z-[90] flex items-center gap-1 rounded-lg border border-surface-border bg-surface-card/95 px-1.5 py-1 shadow-xl">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-white"
        title="Imprimir / salvar em PDF"
      >
        <Printer size={13} /> PDF
      </button>
      <button
        type="button"
        onClick={onExit}
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-white"
        title="Sair do modo apresentação (Esc)"
      >
        <X size={13} /> Sair
      </button>
    </div>
  )
}

function AppShell({ user, effectivePage, PageComponent, showFilterBar, sidebarOpen, setSidebarOpen, onNavigate }) {
  const { presentationMode, setPresentationMode } = useDashboardFilters()

  useEffect(() => {
    if (!presentationMode) return
    const onKey = (e) => {
      if (e.key === 'Escape') setPresentationMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentationMode, setPresentationMode])

  return (
    <div className="flex flex-col h-screen bg-[#0F0F0F] overflow-hidden">
      {!presentationMode && (
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!presentationMode && (
          <Sidebar
            activePage={effectivePage}
            onNavigate={onNavigate}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            userRole={user.role}
          />
        )}

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {showFilterBar && !presentationMode && <FilterBar activePage={effectivePage} />}
          {presentationMode && <PresentationToolbar onExit={() => setPresentationMode(false)} />}
          <main className="app-main flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6">
            <PageComponent />
          </main>
        </div>
      </div>
    </div>
  )
}
