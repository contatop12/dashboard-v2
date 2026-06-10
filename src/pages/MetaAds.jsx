import { useMemo, useState, useEffect } from 'react'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import {
  Cog,
} from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import CreativesCarousel from '@/components/CreativesCarousel'
import MetaCreativesSettingsModal from '@/components/MetaCreativesSettingsModal'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerMetaQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import MetaMetricsPanel from '@/components/MetaMetricsPanel'
import MetaAnalysisPanel from '@/components/MetaAnalysisPanel'
import { MonthlyAccountResultsTable } from '@/components/MonthlyAccountResultsTable'
import {
  readMetaCreativesSort,
  writeMetaCreativesSort,
  readMetaCreativesMetricKeys,
  writeMetaCreativesMetricKeys,
} from '@/lib/metaCreativesPreferences'
import { CampaignTree } from '@/components/CampaignTree'
import { BlockCard } from '@/components/ui/BlockCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCampaignStatusMutation } from '@/hooks/useCampaignStatusMutation'
import { filterOptionsFromTree, resolveTreeSlice } from '@/lib/filterOptionsFromTree'

function MetaCampaignsBlock() {
  const { activeOrgId } = useOrgWorkspace()
  const { loading, data } = usePlatformOverview()
  const { dimensionFilters, setFilterOptions } = useDashboardFilters()
  const { mutate } = useCampaignStatusMutation(activeOrgId)
  const [tree, setTree] = useState([])
  const [pendingToggle, setPendingToggle] = useState(null) // { level, id, name, nextStatus }

  useEffect(() => { setTree(Array.isArray(data?.tree) ? data.tree : []) }, [data?.tree])

  // Publica opções de filtro derivadas da árvore completa; FilterBar consome do contexto.
  useEffect(() => {
    if (!Array.isArray(data?.tree)) return
    const o = filterOptionsFromTree(data.tree)
    setFilterOptions({ campanha: o.campanha, children: o.children, ads: o.ads, objetivo: o.objetivo })
  }, [data?.tree, setFilterOptions])

  useEffect(() => () => setFilterOptions({}), [setFilterOptions])

  const visibleTree = useMemo(() => resolveTreeSlice(tree, dimensionFilters), [tree, dimensionFilters])

  const applyStatus = (node, status) => {
    const patch = (list) =>
      list.map((c) => ({
        ...c,
        effectiveStatus: c.id === node.id && node.level === 'campaign' ? status : c.effectiveStatus,
        adsets: (c.adsets || []).map((s) => ({
          ...s,
          effectiveStatus: s.id === node.id && node.level === 'adset' ? status : s.effectiveStatus,
          ads: (s.ads || []).map((a) => ({
            ...a,
            effectiveStatus: a.id === node.id && node.level === 'ad' ? status : a.effectiveStatus,
          })),
        })),
      }))
    setTree(patch)
  }

  const onConfirmToggle = async () => {
    const node = pendingToggle
    if (!node) return
    const prevStatus = node.nextStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    applyStatus(node, node.nextStatus) // optimistic
    const ok = await mutate(node)
    if (!ok) applyStatus(node, prevStatus) // rollback
  }

  const state = loading ? 'loading' : data?.campaignsError ? 'error' : visibleTree.length === 0 ? 'empty' : 'ready'
  const activeCount = visibleTree.filter((c) => String(c.effectiveStatus).toUpperCase() === 'ACTIVE').length

  return (
    <BlockCard
      title="Campanhas Meta Ads"
      badge={`${activeCount} ativas · ${visibleTree.length} campanhas`}
      state={state}
      emptyMessage="Nenhuma campanha no período."
      errorMessage={String(data?.campaignsError || '')}
      bodyClassName="overflow-auto"
    >
      <CampaignTree
        tree={visibleTree}
        onToggleStatus={(node) => setPendingToggle(node)}
      />
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar campanha?' : 'Ativar campanha?'}
        description={`Isso afeta a entrega ao vivo de "${pendingToggle?.name ?? ''}".`}
        confirmLabel={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar' : 'Ativar'}
        destructive={pendingToggle?.nextStatus === 'PAUSED'}
        onConfirm={onConfirmToggle}
      />
    </BlockCard>
  )
}

function normaliseMetaCreativeRow(raw) {
  const spend = Number(raw?.spend) || 0
  const leads = Number(raw?.leads) || 0
  const impressions = Number(raw?.impressions) || 0
  const linkClicks = Number(raw?.linkClicks ?? raw?.clicks) || 0
  return { ...raw, spend, leads, impressions, linkClicks }
}

function buildCreativeMetricRow(metricKey, card) {
  const { spend, leads, impressions, linkClicks } = card
  const cpl = leads > 0 ? spend / leads : null
  const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : null
  const highlight = metricKey === 'leads'
  switch (metricKey) {
    case 'leads':
      return { label: 'Leads (form.)', value: String(Math.round(leads)), highlight }
    case 'cpl':
      return { label: 'Custo/Lead', value: cpl != null ? formatCurrency(cpl) : '—', highlight: false }
    case 'spend':
      return { label: 'Investimento', value: formatCurrency(spend), highlight: false }
    case 'impressions':
      return { label: 'Impressões', value: formatNumber(impressions), highlight: false }
    case 'clicks':
      return { label: 'Cliques (link)', value: formatNumber(linkClicks), highlight: false }
    case 'ctr': {
      const ok = impressions > 0 && linkClicks >= 0 && !Number.isNaN(ctr)
      return { label: 'CTR (link)', value: ok ? formatPercent(ctr) : '—', highlight: false }
    }
    default:
      return { label: '—', value: '—', highlight: false }
  }
}

function compareMetaCreatives(a, b, sortId) {
  const nameA = String(a.name ?? '').toLowerCase()
  const nameB = String(b.name ?? '').toLowerCase()
  const cplA = a.leads > 0 ? a.spend / a.leads : null
  const cplB = b.leads > 0 ? b.spend / b.leads : null
  const ctrA = a.impressions > 0 ? (a.linkClicks / a.impressions) * 100 : 0
  const ctrB = b.impressions > 0 ? (b.linkClicks / b.impressions) * 100 : 0
  switch (sortId) {
    case 'spend_desc':
      return (b.spend || 0) - (a.spend || 0)
    case 'leads_desc':
      return (b.leads || 0) - (a.leads || 0)
    case 'cpl_asc': {
      const ca = cplA ?? Number.POSITIVE_INFINITY
      const cb = cplB ?? Number.POSITIVE_INFINITY
      if (ca !== cb) return ca - cb
      return (b.spend || 0) - (a.spend || 0)
    }
    case 'impressions_desc':
      return (b.impressions || 0) - (a.impressions || 0)
    case 'ctr_desc':
      return ctrB - ctrA
    case 'clicks_desc':
      return (b.linkClicks || 0) - (a.linkClicks || 0)
    case 'name_asc':
      return nameA.localeCompare(nameB, 'pt')
    default:
      return 0
  }
}

function MetaCreativesCarouselBlock() {
  const { data } = usePlatformOverview()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sortId, setSortId] = useState(() => readMetaCreativesSort())
  const [metricKeys, setMetricKeys] = useState(() => readMetaCreativesMetricKeys())

  const baseCards = useMemo(() => {
    const c = data?.creatives
    return Array.isArray(c) ? c.map(normaliseMetaCreativeRow) : []
  }, [data?.creatives])

  const empty = Array.isArray(data?.creatives) && data.creatives.length === 0
  const activeCount = baseCards.filter((c) => c.status === 'active').length

  const cards = useMemo(() => {
    if (empty) return []
    const sorted = [...baseCards].sort((a, b) => compareMetaCreatives(a, b, sortId))
    return sorted.map((card) => ({
      ...card,
      metrics: metricKeys.map((k) => buildCreativeMetricRow(k, card)),
    }))
  }, [baseCards, empty, sortId, metricKeys])

  const onSortIdChange = (id) => {
    setSortId(id)
    writeMetaCreativesSort(id)
  }

  const onMetricKeysChange = (keys) => {
    setMetricKeys(keys)
    writeMetaCreativesMetricKeys(keys)
  }

  return (
    <>
      <CreativesCarousel
        title="Criativos — Meta Ads"
        badge={empty ? '0 no período' : `${activeCount} ativos`}
        cards={cards}
        emptyMessage="Nenhum anúncio com gasto no período selecionado. Ajuste as datas ou verifique as campanhas."
        headerExtra={
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-hover hover:text-white"
            aria-label="Configurar criativos"
          >
            <Cog size={14} />
          </button>
        }
      />
      <MetaCreativesSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sortId={sortId}
        onSortIdChange={onSortIdChange}
        metricKeys={metricKeys}
        onMetricKeysChange={onMetricKeysChange}
      />
    </>
  )
}

function buildMetaDefinitions(activeChart, setActiveChart) {
  return [
    {
      id: 'meta-metrics',
      tier: 'primary',
      defaultColSpan: 8,
      defaultRowSpan: 5,
      minColSpan: 4,
      maxColSpan: 8,
      minRowSpan: 3,
      maxRowSpan: 8,
      render: () => <MetaMetricsPanel />,
    },
    {
      id: 'meta-analysis',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 8,
      minColSpan: 4,
      maxColSpan: 8,
      minRowSpan: 6,
      maxRowSpan: 12,
      render: () => <MetaAnalysisPanel activeChart={activeChart} setActiveChart={setActiveChart} />,
    },
    {
      id: 'meta-creatives',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 2,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 8,
      render: () => <MetaCreativesCarouselBlock />,
    },
    {
      id: 'meta-campaigns',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 3,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 2,
      maxRowSpan: 10,
      render: () => <MetaCampaignsBlock />,
    },
    {
      id: 'meta-monthly-results',
      tier: 'secondary',
      defaultColSpan: 8,
      defaultRowSpan: 4,
      minColSpan: 2,
      maxColSpan: 8,
      minRowSpan: 3,
      maxRowSpan: 12,
      render: () => <MonthlyAccountResultsTable platform="meta" />,
    },
  ]
}

function MetaAdsPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange }) {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()
  const secretsMode = user?.role === 'super_admin' && !activeOrgId

  return (
    <header className="shrink-0 border-b border-white/[0.06] py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-400">
            Meta Ads
          </span>
          {!secretsMode ? (
            <>
              <span className="text-white/20" aria-hidden>
                ·
              </span>
              <SuperAdminAccountTitle
                endpoint="/api/admin/platform/meta-overview"
                emptyLabel="Conta de anúncios"
                className="min-w-0 max-w-[min(100%,20rem)] text-left"
                size="sm"
                workerPlatformQuery={workerPlatformQuery}
                syncOverviewDates
              />
            </>
          ) : null}
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-wrap items-center justify-end gap-2">
          <WorkerSecretsAccountPicker
            compact
            provider="meta_ads"
            onWorkerQueryChange={onWorkerPlatformQueryChange}
          />
          <ChannelAccountPicker provider="meta_ads" className="shrink-0" />
        </div>
      </div>
    </header>
  )
}

function MetaAdsInner({ workerPlatformQuery, onWorkerPlatformQueryChange, definitions }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <MetaAdsPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid definitions={definitions} className="min-h-full" />
      </div>
    </div>
  )
}

export default function MetaAds() {
  const [activeChart, setActiveChart] = useState('gasto')
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerMetaQueryFromStorage() : ''
  )
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi, dimensionFilters } = useDashboardFilters()
  const definitions = useMemo(() => buildMetaDefinitions(activeChart, setActiveChart), [activeChart])

  // Traduz seleção do FilterBar em params do overview (campanha explícita ganha de objetivo).
  const apiFilters = useMemo(() => {
    const f = {}
    if (dimensionFilters.objetivo?.campaignIds?.length) f.campaignIds = dimensionFilters.objetivo.campaignIds
    if (dimensionFilters.campanha?.id) f.campaignIds = [dimensionFilters.campanha.id]
    if (dimensionFilters.children?.id) f.adsetId = dimensionFilters.children.id
    if (dimensionFilters.ads?.id) f.adId = dimensionFilters.ads.id
    return f
  }, [dimensionFilters])

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/meta-overview', {
        orgId: activeOrgId,
        workerQuery: workerPlatformQuery,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
        filters: apiFilters,
      }),
    [activeOrgId, workerPlatformQuery, dateRange, compareDateRange, comparePrimaryKpi, apiFilters]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <MetaAdsInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
        definitions={definitions}
      />
    </PlatformOverviewProvider>
  )
}
