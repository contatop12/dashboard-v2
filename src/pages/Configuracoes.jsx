import { useState } from 'react'
import { Palette, User, Bell, Shield, Zap, Link2 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { normalizeLayout } from '@/lib/dashboardGrid'
import DesignSystem from './DesignSystem'
import Conexoes from './Conexoes'

const TABS = [
  { id: 'design', label: 'Design System', icon: Palette },
  { id: 'conta', label: 'Conta', icon: User },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'permissoes', label: 'Permissões', icon: Shield },
  { id: 'integracoes', label: 'Integrações', icon: Zap },
  { id: 'conexoes', label: 'Conexões', icon: Link2 },
]

function ContaTab() {
  return (
    <div className="max-w-lg flex flex-col gap-4">
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Informações da Conta</h3>
        <div className="flex flex-col gap-3">
          {[{ label: 'Nome', value: 'Administrador' }, { label: 'Email', value: 'contato@p12digital.com.br' }, { label: 'Empresa', value: 'P12 Digital' }].map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-sans">{label}</span>
              <input defaultValue={value} className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans transition-colors" />
            </div>
          ))}
          <button className="mt-2 bg-brand text-[#0F0F0F] text-xs font-semibold px-4 py-2 rounded-md hover:bg-brand/90 transition-all w-fit">Salvar Alterações</button>
        </div>
      </div>
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Alterar Senha</h3>
        <div className="flex flex-col gap-3">
          {['Senha Atual', 'Nova Senha', 'Confirmar Nova Senha'].map(l => (
            <div key={l} className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-sans">{l}</span>
              <input type="password" placeholder="••••••••" className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50 font-sans transition-colors" />
            </div>
          ))}
          <button className="mt-2 bg-surface-card border border-surface-border text-white text-xs font-sans px-4 py-2 rounded-md hover:bg-surface-hover transition-all w-fit">Alterar Senha</button>
        </div>
      </div>
    </div>
  )
}

function NotificacoesTab() {
  const [prefs, setPrefs] = useState({ emailDiario: true, emailSemanal: false, alertaKPI: true, alertaCusto: true, novoCampanha: false })
  return (
    <div className="max-w-lg">
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Preferências de Notificação</h3>
        <div className="flex flex-col gap-4">
          {[
            { key: 'emailDiario', label: 'Relatório Diário por Email', desc: 'Resumo dos KPIs principais todo dia às 8h' },
            { key: 'emailSemanal', label: 'Relatório Semanal', desc: 'Comparativo semanal com métricas detalhadas' },
            { key: 'alertaKPI', label: 'Alertas de KPI', desc: 'Notificação quando algum KPI sair do normal' },
            { key: 'alertaCusto', label: 'Alerta de Orçamento', desc: 'Aviso quando o gasto atingir 80% do budget' },
            { key: 'novoCampanha', label: 'Nova Campanha', desc: 'Notificar quando uma campanha for criada' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-sans text-white">{label}</span>
                <span className="text-[11px] text-muted-foreground font-sans">{desc}</span>
              </div>
              <button
                onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                className={`relative w-9 h-5 rounded-full transition-all ${prefs[key] ? 'bg-brand' : 'bg-surface-border'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${prefs[key] ? 'left-4.5 translate-x-0' : 'left-0.5'}`} style={{ left: prefs[key] ? '18px' : '2px' }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IntegracoesTab() {
  const integracoes = [
    { nome: 'Meta Ads', status: 'connected', icon: '📘', desc: 'Conta: p12digital@meta.com' },
    { nome: 'Google Ads', status: 'connected', icon: '🔍', desc: 'MCC: 123-456-7890' },
    { nome: 'Google Analytics 4', status: 'connected', icon: '📊', desc: 'Propriedade: P12 Digital' },
    { nome: 'Google Meu Negócio', status: 'connected', icon: '📍', desc: '1 local cadastrado' },
    { nome: 'Instagram Business', status: 'connected', icon: '📷', desc: '@p12digital' },
    { nome: 'Slack', status: 'disconnected', icon: '💬', desc: 'Alertas e relatórios' },
  ]
  return (
    <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
      {integracoes.map(i => (
        <div key={i.nome} className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl shrink-0">{i.icon}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-sans font-semibold text-white block">{i.nome}</span>
            <span className="text-[11px] text-muted-foreground font-sans">{i.desc}</span>
          </div>
          <button className={`text-[10px] font-mono px-2.5 py-1 rounded-md border shrink-0 ${i.status === 'connected' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-muted-foreground border-surface-border hover:border-brand/40 hover:text-brand'}`}>
            {i.status === 'connected' ? '● Ativo' : 'Conectar'}
          </button>
        </div>
      ))}
    </div>
  )
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('design')
  const { theme } = useTheme()
  const L = normalizeLayout(theme.layout)

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
      <div className="flex gap-6">
        {/* Side nav */}
        <div className="w-44 shrink-0">
          <nav className="flex flex-col gap-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-sans transition-all ${activeTab === id ? 'bg-brand/15 text-brand' : 'text-muted-foreground hover:text-white hover:bg-surface-card'}`}
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
          {activeTab === 'integracoes' && <IntegracoesTab />}
          {activeTab === 'conexoes' && <Conexoes />}
          {activeTab === 'permissoes' && (
            <div className="max-w-lg">
              <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                <h3 className="mb-2 font-display text-sm font-semibold text-white">Gerenciamento de Usuários</h3>
                <p className="font-sans text-xs text-muted-foreground">Super Admin — módulo de atribuição de contas por usuário em desenvolvimento.</p>
                <div className="mt-4 rounded-lg border border-brand/20 bg-brand/10 p-3">
                  <p className="font-sans text-xs text-brand">Em breve: atribua contas (Meta Ads, Google Ads) a usuários específicos. Cada usuário verá apenas os dados das contas autorizadas.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
