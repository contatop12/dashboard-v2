import { useEffect, useState } from 'react'
import { Calendar, ChevronDown, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'

// Filter configs per page
const PAGE_FILTERS = {
  'Geral': ['dateRange', 'campanha', 'grupoAnuncios', 'palavrasChave', 'objetivo'],
  'Meta Ads': ['dateRange', 'campanha', 'conjuntoAnuncios', 'anuncio', 'objetivo', 'posicionamento'],
  'Google Ads': ['dateRange', 'campanha', 'grupoAnuncios', 'palavrasChave', 'tipoCampanha'],
  'Google Meu Negócio': ['dateRange', 'local'],
  'Instagram': ['dateRange', 'perfil', 'tipoConteudo'],
  'Campanhas': ['dateRange', 'campanha', 'objetivo'],
  'Anúncios': ['dateRange', 'campanha', 'tipoAnuncio'],
  'Palavras-chave': ['dateRange', 'campanha', 'palavrasChave', 'tipoCorrespondencia'],
  'Relatórios': ['dateRange'],
  'Configurações': [],
}

const FILTER_OPTIONS = {
  campanha: { label: 'Campanha', options: ['Todas', 'Campanha_Leads_SP', 'Campanha_Retarget_RJ', 'Campanha_Brand_MG'] },
  grupoAnuncios: { label: 'Grupo de Anúncios', options: ['Todos', 'Grupo_Prospeccao', 'Grupo_Retargeting'] },
  palavrasChave: { label: 'Palavras-chave', options: ['Todas', 'consultoria financeira', 'planejamento financeiro'] },
  objetivo: { label: 'Objetivo', options: ['Todos', 'Geração de Leads', 'Conversão', 'Tráfego', 'Reconhecimento'] },
  conjuntoAnuncios: { label: 'Conjunto de Anúncios', options: ['Todos', 'Conj_Prospeccao', 'Conj_Retargeting', 'Conj_Lookalike'] },
  anuncio: { label: 'Anúncio', options: ['Todos', 'Carrossel_01', 'Video_30s', 'Imagem_Estatica'] },
  posicionamento: { label: 'Posicionamento', options: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'] },
  tipoCampanha: { label: 'Tipo', options: ['Todos', 'Search', 'Display', 'Performance Max', 'Video', 'Shopping'] },
  local: { label: 'Local', options: ['Todos os Locais', 'São Paulo - Centro', 'São Paulo - Zona Sul'] },
  perfil: { label: 'Perfil', options: ['@p12digital', '@p12empresa'] },
  tipoConteudo: { label: 'Tipo de Conteúdo', options: ['Todos', 'Feed', 'Stories', 'Reels', 'IGTV'] },
  tipoAnuncio: { label: 'Tipo de Anúncio', options: ['Todos', 'Search', 'Display', 'Video'] },
  tipoCorrespondencia: { label: 'Correspondência', options: ['Todas', 'Exata', 'Frase', 'Ampla'] },
}

function FilterSelect({ filterKey, value, onChange, optionsOverride }) {
  const [open, setOpen] = useState(false)
  const config = FILTER_OPTIONS[filterKey]
  if (!config) return null
  const options = optionsOverride ?? config.options

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="filter-select"
      >
        <span className="text-white max-w-[120px] truncate">{value || config.label}</span>
        <ChevronDown size={10} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 max-h-60 overflow-y-auto bg-surface-card border border-surface-border rounded-lg shadow-xl z-50 min-w-[160px] py-2 animate-scale-in">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(filterKey, opt); setOpen(false) }}
              className={cn('w-full text-left px-4 py-2 text-xs hover:bg-surface-hover transition-colors', value === opt ? 'text-brand' : 'text-white')}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FilterBar({ activePage, filters, onFiltersChange }) {
  const { activeOrgId } = useOrgWorkspace()
  const [metaLive, setMetaLive] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const activeFilters = PAGE_FILTERS[activePage] ?? ['dateRange']

  useEffect(() => {
    if (activePage !== 'Meta Ads' || !activeOrgId) {
      setMetaLive(null)
      return
    }
    let cancelled = false
    fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setMetaLive(d)
      })
      .catch(() => {
        if (!cancelled) setMetaLive(null)
      })
    return () => {
      cancelled = true
    }
  }, [activePage, activeOrgId])

  useEffect(() => {
    const refetch = () => {
      if (activePage !== 'Meta Ads' || !activeOrgId) return
      fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
        .then((r) => r.json())
        .then(setMetaLive)
        .catch(() => setMetaLive(null))
    }
    window.addEventListener('p12-account-selection-changed', refetch)
    return () => window.removeEventListener('p12-account-selection-changed', refetch)
  }, [activePage, activeOrgId])

  const metaOptionsFor = (key) => {
    if (activePage !== 'Meta Ads' || !metaLive) return undefined
    const m = {
      campanha: metaLive.campanha,
      conjuntoAnuncios: metaLive.conjuntoAnuncios,
      anuncio: metaLive.anuncio,
      objetivo: metaLive.objetivo,
      posicionamento: metaLive.posicionamento,
    }
    return m[key]
  }

  if (activeFilters.length === 0) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    if (activePage === 'Meta Ads' && activeOrgId) {
      try {
        const r = await fetch(`/api/orgs/${activeOrgId}/meta-ads-filters`, { credentials: 'include' })
        const data = await r.json()
        setMetaLive(data)
      } catch {
        setMetaLive(null)
      }
    }
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="min-h-12 bg-[#0F0F0F] border-b border-surface-border flex items-center px-4 gap-2 shrink-0 flex-wrap py-2">
      {activeFilters.includes('dateRange') && (
        <>
          <button className="filter-select">
            <Calendar size={11} className="text-muted-foreground" />
            <span className="text-white text-xs hidden sm:block">1 jan – 31 jan 2025</span>
            <span className="text-white text-xs sm:hidden">Jan 2025</span>
            <ChevronDown size={10} className="text-muted-foreground" />
          </button>
          <div className="w-px h-4 bg-surface-border mx-2 hidden sm:block" />
        </>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {activeFilters.filter(f => f !== 'dateRange').map(filterKey => (
          <FilterSelect
            key={filterKey}
            filterKey={filterKey}
            value={filters[filterKey] || ''}
            optionsOverride={metaOptionsFor(filterKey)}
            onChange={(key, val) => onFiltersChange({ ...filters, [key]: val })}
          />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={handleRefresh}
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-white hover:bg-surface-card transition-all"
          title="Atualizar"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  )
}
