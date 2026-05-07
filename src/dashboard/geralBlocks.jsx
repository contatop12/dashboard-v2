import GeralKpiCard, { GERAL_KPI_CARDS } from '@/components/GeralKpiCard'
import TimelineChart from '@/components/TimelineChart'
import OverviewTable from '@/components/OverviewTable'
import FunnelGeral from '@/components/FunnelGeral'
import Demographics from '@/components/Demographics'
import InvestimentoChart from '@/components/InvestimentoChart'
import VideoRange from '@/components/VideoRange'
import KeywordsHighlight from '@/components/KeywordsHighlight'

const KPI_BLOCK_DEFS = GERAL_KPI_CARDS.map((c) => ({
  id: `kpi-${c.id}`,
  tier: 'primary',
  defaultLayout: { w: 2, h: 2, minW: 1, maxW: 4, minH: 2, maxH: 4 },
  render: () => <GeralKpiCard {...c} />,
}))

export const GERAL_DASHBOARD_BLOCKS = [
  ...KPI_BLOCK_DEFS,
  {
    id: 'timeline',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 4, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <TimelineChart />,
  },
  {
    id: 'funnel-geral',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 4, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <FunnelGeral />,
  },
  {
    id: 'overview',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <OverviewTable />,
  },
  {
    id: 'demographics',
    tier: 'secondary',
    defaultLayout: { w: 6, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <Demographics />,
  },
  {
    id: 'investimento-chart',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <InvestimentoChart />,
  },
  {
    id: 'video-range',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <VideoRange />,
  },
  {
    id: 'keywords',
    tier: 'secondary',
    defaultLayout: { w: 4, h: 3, minW: 2, maxW: 12, minH: 2, maxH: 12 },
    render: () => <KeywordsHighlight />,
  },
]
