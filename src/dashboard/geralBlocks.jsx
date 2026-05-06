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
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GeralKpiCard {...c} />,
}))

/** Definições estáticas da página Geral (ordem inicial + spans padrão). */
export const GERAL_DASHBOARD_BLOCKS = [
  ...KPI_BLOCK_DEFS,
  {
    id: 'timeline',
    defaultColSpan: 4,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <TimelineChart />,
  },
  {
    id: 'funnel-geral',
    defaultColSpan: 4,
    defaultRowSpan: 3,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <FunnelGeral />,
  },
  {
    id: 'overview',
    defaultColSpan: 4,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <OverviewTable />,
  },
  {
    id: 'demographics',
    defaultColSpan: 4,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 10,
    render: () => <Demographics />,
  },
  {
    id: 'investimento-chart',
    defaultColSpan: 3,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <InvestimentoChart />,
  },
  {
    id: 'video-range',
    defaultColSpan: 3,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <VideoRange />,
  },
  {
    id: 'keywords',
    defaultColSpan: 2,
    defaultRowSpan: 2,
    minColSpan: 2,
    maxColSpan: 8,
    minRowSpan: 2,
    maxRowSpan: 8,
    render: () => <KeywordsHighlight />,
  },
]
