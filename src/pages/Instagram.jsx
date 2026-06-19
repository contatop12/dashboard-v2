import { useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { formatNumber, formatPercent } from '@/lib/utils'
import CreativesCarousel from '@/components/CreativesCarousel'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import WorkerSecretsAccountPicker, {
  readWorkerInstagramQueryFromStorage,
} from '@/components/WorkerSecretsAccountPicker'
import InstagramMetricsPanel from '@/components/InstagramMetricsPanel'
import InstagramTopPostsTable from '@/components/InstagramTopPostsTable'
import { MonthlyAccountResultsTable } from '@/components/MonthlyAccountResultsTable'

function InstagramPostsCarouselBlock() {
  const { data } = usePlatformOverview()
  const posts = Array.isArray(data?.posts) ? data.posts : []

  const cards = useMemo(
    () =>
      posts.map((p) => ({
        name: p.name,
        tag: p.tag,
        tagBg: p.tagBg,
        tagColor: p.tagColor,
        imageUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
        mediaType: p.mediaType?.toLowerCase?.().includes('video') ? 'video' : 'image',
        metrics: [
          { label: 'Alcance', value: formatNumber(p.reach || p.impressions), highlight: true },
          { label: 'Curtidas', value: formatNumber(p.likes) },
          { label: 'Taxa Eng.', value: formatPercent(p.engagementRate) },
        ],
      })),
    [posts]
  )

  return (
    <CreativesCarousel
      title="Publicações — Instagram"
      badge={posts.length === 0 ? '0 no período' : `${posts.length} no período`}
      cards={cards}
      emptyMessage="Nenhuma publicação no período selecionado. Ajuste as datas ou publique novo conteúdo."
    />
  )
}

const IG_DASHBOARD_BLOCKS = [
  {
    id: 'ig-metrics',
    tier: 'primary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 6,
    render: () => <InstagramMetricsPanel />,
  },
  {
    id: 'ig-posts-carousel',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <InstagramPostsCarouselBlock />,
  },
  {
    id: 'ig-top-posts',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 10,
    render: () => <InstagramTopPostsTable />,
  },
  {
    id: 'ig-monthly-results',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 4,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 12,
    render: () => <MonthlyAccountResultsTable platform="instagram" />,
  },
]

function InstagramPageHeader({ workerPlatformQuery, onWorkerPlatformQueryChange }) {
  const { user } = useAuth()
  const { activeOrgId } = useOrgWorkspace()
  const secretsMode = user?.role === 'super_admin' && !activeOrgId

  return (
    <header className="shrink-0 border-b border-white/[0.06] py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-pink-400">
            Instagram
          </span>
          {!secretsMode ? (
            <>
              <span className="text-white/20" aria-hidden>
                ·
              </span>
              <SuperAdminAccountTitle
                endpoint="/api/admin/platform/instagram-overview"
                emptyLabel="@usuário"
                className="min-w-0 max-w-[min(100%,20rem)] text-left"
                size="sm"
                workerPlatformQuery={workerPlatformQuery}
                syncOverviewDates
              />
            </>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
          <WorkerSecretsAccountPicker
            compact
            provider="instagram"
            onWorkerQueryChange={onWorkerPlatformQueryChange}
          />
          <ChannelAccountPicker provider="instagram" className="shrink-0" />
        </div>
      </div>
    </header>
  )
}

function InstagramInner({ workerPlatformQuery, onWorkerPlatformQueryChange }) {
  const definitions = useMemo(() => IG_DASHBOARD_BLOCKS, [])

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <InstagramPageHeader
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={onWorkerPlatformQueryChange}
      />
      <div className="min-h-0 flex-1">
        <DashboardGrid definitions={definitions} className="min-h-full" />
      </div>
    </div>
  )
}

export default function InstagramPage() {
  const [workerPlatformQuery, setWorkerPlatformQuery] = useState(() =>
    typeof window !== 'undefined' ? readWorkerInstagramQueryFromStorage() : ''
  )
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi } = useDashboardFilters()

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/instagram-overview', {
        orgId: activeOrgId,
        workerQuery: workerPlatformQuery,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
      }),
    [activeOrgId, workerPlatformQuery, dateRange, compareDateRange, comparePrimaryKpi]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <InstagramInner
        workerPlatformQuery={workerPlatformQuery}
        onWorkerPlatformQueryChange={setWorkerPlatformQuery}
      />
    </PlatformOverviewProvider>
  )
}
