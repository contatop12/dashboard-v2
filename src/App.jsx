import { useEffect, useState } from 'react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'

import DashboardGrid from './components/DashboardGrid'
import { GERAL_DASHBOARD_BLOCKS } from './dashboard/geralBlocks'
import { useAuth } from './context/AuthContext'
import { DashboardFiltersProvider } from './context/DashboardFiltersContext'
import Login from './pages/Login'

// Pages
import MetaAds from './pages/MetaAds'
import GoogleAds from './pages/GoogleAds'
import GoogleMeuNegocio from './pages/GoogleMeuNegocio'
import InstagramPage from './pages/Instagram'
import Configuracoes from './pages/Configuracoes'
import Clientes from './pages/Clientes'

function GeralPage() {
  return <DashboardGrid pageId="Geral" definitions={GERAL_DASHBOARD_BLOCKS} className="min-h-full" />
}

function Splash() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center gap-4">
      <div className="w-9 h-9 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-muted-foreground font-sans">Carregando sessão…</p>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
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

  if (loading) return <Splash />
  if (!user) return <Login />

  const effectivePage =
    activePage === 'Clientes' && user.role !== 'super_admin' ? 'Geral' : activePage

  const PageComponent = PAGE_COMPONENTS[effectivePage] ?? GeralPage
  const showFilterBar = effectivePage !== 'Configurações' && effectivePage !== 'Clientes'

  return (
    <DashboardFiltersProvider>
      <div className="flex flex-col h-screen bg-[#0F0F0F] overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarOpen={sidebarOpen} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            activePage={effectivePage}
            onNavigate={(page) => {
              setActivePage(page)
              setSidebarOpen(false)
            }}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            userRole={user.role}
          />

          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            {showFilterBar && <FilterBar activePage={effectivePage} />}
            <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 sm:px-6">
              <PageComponent />
            </main>
          </div>
        </div>
      </div>
    </DashboardFiltersProvider>
  )
}
