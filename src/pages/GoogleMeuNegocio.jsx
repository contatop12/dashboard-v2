import { useMemo, useState } from 'react'
import { Eye, Phone, Navigation, Globe, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerGmbQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import GmbDailyChart from '@/components/GmbDailyChart'
import GmbSearchTermsTable from '@/components/GmbSearchTermsTable'
import GmbReviewsBlock from '@/components/GmbReviewsBlock'
import GmbByLocationTable from '@/components/GmbByLocationTable'

const KPI_ICONS = {
  'Visualizações': Eye,
  'Ligações': Phone,
  'Cliques no site': Globe,
  'Rotas': Navigation,
  'Conversas': MessageSquare,
}
const KPI_ORDER = ['Visualizações', 'Ligações', 'Cliques no site', 'Rotas', 'Conversas']

function GmbKpiCard({ index }) {
  const { data } = usePlatformOverview()
  const metrics = Array.isArray(data?.metrics) ? data.metrics : []
  const label = KPI_ORDER[index]
  const m = metrics.find((x) => x.label === label)
  const Icon = KPI_ICONS[label] ?? Eye
  const value = m?.value ?? '—'
  const delta = m?.deltaPct
  const isPos = typeof delta === 'number' && delta > 0
  const isNeg = typeof delta === 'number' && delta < 0
  return (
    <div className="kpi-card min-h-0 w-full shrink-0">
      <div className="flex items-center justify-between">
        <span className="kpi-label block truncate">{label}</span>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#34A853]/15">
          <Icon size={12} className="text-[#34A853]" />
        </div>
      </div>
      <span className="kpi-value mt-2 block truncate tabular-nums">{value}</span>
      <div className="kpi-delta-row min-w-0">
        {typeof delta === 'number' ? (
          <div className={cn('inline-flex shrink-0 items-center gap-1', isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-muted-foreground')}>
            {isPos ? <TrendingUp size={12} strokeWidth={2} /> : isNeg ? <TrendingDown size={12} strokeWidth={2} /> : null}
            <span>{isPos ? '+' : ''}{delta.toFixed(1)}%</span>
          </div>
        ) : (
          <span className="kpi-delta-note text-muted-foreground">no período</span>
        )}
      </div>
    </div>
  )
}

const KPI_BLOCKS = KPI_ORDER.map((label, i) => ({
  id: `gmb-kpi-${i}`,
  tier: 'primary',
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GmbKpiCard index={i} />,
}))

const GMB_DASHBOARD_BLOCKS = [
  ...KPI_BLOCKS,
  { id: 'gmb-daily', tier: 'secondary', defaultColSpan: 8, defaultRowSpan: 3, minColSpan: 3, maxColSpan: 12, minRowSpan: 2, maxRowSpan: 8, render: () => <GmbDailyChart /> },
  { id: 'gmb-terms', tier: 'secondary', defaultColSpan: 4, defaultRowSpan: 4, minColSpan: 2, maxColSpan: 8, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbSearchTermsTable /> },
  { id: 'gmb-reviews', tier: 'secondary', defaultColSpan: 4, defaultRowSpan: 4, minColSpan: 2, maxColSpan: 8, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbReviewsBlock /> },
  { id: 'gmb-locations', tier: 'secondary', defaultColSpan: 8, defaultRowSpan: 3, minColSpan: 2, maxColSpan: 12, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbByLocationTable /> },
]

function LocationPicker({ selectedLocationId, onChange }) {
  const { data } = usePlatformOverview()
  const locations = Array.isArray(data?.locations) ? data.locations : []
  if (locations.length <= 1) return null
  const current = selectedLocationId ?? data?.selectedLocationId ?? locations[0]?.id ?? ''
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[min(100%,220px)] shrink-0 rounded-md border border-surface-border bg-surface-input py-1.5 pl-2 pr-8 text-[10px] text-foreground font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="Selecionar local"
    >
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

function GmbPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange, selectedLocationId, onLocationChange }) {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()
  const secretsMode = user?.role === 'super_admin' && !activeOrgId

  return (
    <header className="shrink-0 border-b border-white/[0.06] py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#34A853]">
            Google Meu Negócio
          </span>
          {!secretsMode ? (
            <>
              <span className="text-white/20" aria-hidden>
                ·
              </span>
              <SuperAdminAccountTitle
                className="min-w-0 max-w-[min(100%,20rem)] text-left"
                size="sm"
                endpoint="/api/admin/platform/google-business-overview"
                emptyLabel="Perfil Google Business"
                workerPlatformQuery={workerPlatformQuery}
                syncOverviewDates
              />
            </>
          ) : null}
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-wrap items-center justify-end gap-2">
          <WorkerSecretsAccountPicker
            compact
            provider="google_business"
            onWorkerQueryChange={onWorkerPlatformQueryChange}
          />
          <LocationPicker selectedLocationId={selectedLocationId} onChange={onLocationChange} />
          <ChannelAccountPicker provider="google_business" className="shrink-0" alwaysShowSelect />
        </div>
      </div>
    </header>
  )
}

function GmbInner({ workerPlatformQuery, onWorkerPlatformQueryChange, selectedLocationId, onLocationChange }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <GmbPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
        selectedLocationId={selectedLocationId}
        onLocationChange={onLocationChange}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid definitions={GMB_DASHBOARD_BLOCKS} className="min-h-full" />
      </div>
    </div>
  )
}

export default function GoogleMeuNegocio() {
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi } = useDashboardFilters()
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerGmbQueryFromStorage() : ''
  )

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/google-business-overview', {
        orgId: activeOrgId,
        workerQuery: workerPlatformQuery,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
        filters: { locationId: selectedLocationId },
      }),
    [activeOrgId, workerPlatformQuery, dateRange, compareDateRange, comparePrimaryKpi, selectedLocationId]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <GmbInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
        selectedLocationId={selectedLocationId}
        onLocationChange={setSelectedLocationId}
      />
    </PlatformOverviewProvider>
  )
}
