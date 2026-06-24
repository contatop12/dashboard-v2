import GeralMetricsPanel from '@/components/GeralMetricsPanel'
import { GeralMetaClientsTable, GeralGoogleClientsTable } from '@/components/GeralPlatformClientsTable'

export const GERAL_DASHBOARD_BLOCKS = [
  {
    id: 'geral-metrics',
    tier: 'primary',
    defaultColSpan: 8,
    defaultRowSpan: 5,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 4,
    maxRowSpan: 8,
    render: () => <GeralMetricsPanel />,
  },
  {
    id: 'geral-meta-clients',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 6,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 4,
    maxRowSpan: 14,
    render: () => <GeralMetaClientsTable />,
  },
  {
    id: 'geral-google-clients',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 6,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 4,
    maxRowSpan: 14,
    render: () => <GeralGoogleClientsTable />,
  },
]
