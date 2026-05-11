import { useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Table2, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const TABS = [
  { id: 'age', label: 'Idade' },
  { id: 'gender', label: 'Sexo' },
  { id: 'income', label: 'Renda familiar' },
  { id: 'parental', label: 'Status parental' },
]

const DIM_HEADER = {
  age: 'Idade',
  gender: 'Sexo',
  income: 'Renda familiar',
  parental: 'Status parental',
}

const CHART_METRICS = [
  { id: 'conversions', label: 'Conversões', get: (r) => Number(r.conversions) || 0 },
  {
    id: 'costPerConversion',
    label: 'Custo/conv.',
    get: (r) => (r.costPerConversion != null ? Number(r.costPerConversion) : 0),
  },
  { id: 'impressions', label: 'Impressões', get: (r) => Number(r.impressions) || 0 },
  { id: 'interactions', label: 'Interações', get: (r) => Number(r.interactions) || 0 },
  {
    id: 'interactionRate',
    label: 'Taxa de interação',
    get: (r) => (r.interactionRate != null ? Number(r.interactionRate) : 0),
  },
  { id: 'averageCpc', label: 'Custo médio (CPC)', get: (r) => (r.averageCpc != null ? Number(r.averageCpc) : 0) },
  { id: 'cost', label: 'Custo', get: (r) => Number(r.cost) || 0 },
  { id: 'convRate', label: 'Taxa de conv.', get: (r) => (r.convRate != null ? Number(r.convRate) : 0) },
]

function metricDef(id) {
  return CHART_METRICS.find((m) => m.id === id) ?? CHART_METRICS[0]
}

function formatChartTooltip(metricId, value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  if (['costPerConversion', 'averageCpc', 'cost'].includes(metricId)) return formatCurrency(n)
  if (['interactionRate', 'convRate'].includes(metricId)) return formatPercent(n)
  if (metricId === 'conversions') {
    return Math.abs(n % 1) < 0.001 ? formatNumber(Math.round(n)) : formatNumber(n)
  }
  return formatNumber(Math.round(n))
}

function DemographicsChartTooltip({ active, payload, label, primaryId, secondaryId }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const title = label ?? row.name
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-sans text-muted-foreground">{title}</p>
      <div className="space-y-1 font-mono text-white">
        <div className="flex gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#4285F4] mt-1" />
          <span>
            {metricDef(primaryId).label}: {formatChartTooltip(primaryId, row.primaryRaw)}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="h-2 w-2 shrink-0 rounded-sm bg-[#f43f5e] mt-1" />
          <span>
            {metricDef(secondaryId).label}: {formatChartTooltip(secondaryId, row.secondaryRaw)}
          </span>
        </div>
      </div>
    </div>
  )
}

const columnHelper = createColumnHelper()

function buildTableColumns(tabId) {
  const dim = DIM_HEADER[tabId] ?? 'Segmento'
  return [
    columnHelper.accessor('segmentLabel', {
      id: 'dim',
      header: dim,
      cell: (c) => <span className="font-sans text-white">{c.getValue()}</span>,
      enableHiding: false,
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('impressions', {
      id: 'impr',
      header: 'Impressões',
      cell: (c) => <span className="tabular-nums">{formatNumber(Math.round(Number(c.getValue()) || 0))}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor('interactions', {
      id: 'inter',
      header: 'Interações',
      cell: (c) => <span className="tabular-nums">{formatNumber(Math.round(Number(c.getValue()) || 0))}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor('interactionRate', {
      id: 'txInt',
      header: 'Taxa interação',
      cell: (c) => {
        const v = c.getValue()
        return <span className="tabular-nums">{v != null ? formatPercent(Number(v)) : '—'}</span>
      },
      sortingFn: (a, b, col) => {
        const x = a.getValue(col) ?? -1
        const y = b.getValue(col) ?? -1
        return Number(x) - Number(y)
      },
    }),
    columnHelper.accessor('averageCpc', {
      id: 'cpc',
      header: 'Custo médio',
      cell: (c) => {
        const v = c.getValue()
        return <span className="tabular-nums">{v != null ? formatCurrency(Number(v)) : '—'}</span>
      },
      sortingFn: (a, b, col) => {
        const x = a.getValue(col)
        const y = b.getValue(col)
        if (x == null && y == null) return 0
        if (x == null) return 1
        if (y == null) return -1
        return Number(x) - Number(y)
      },
    }),
    columnHelper.accessor('cost', {
      id: 'custo',
      header: 'Custo',
      cell: (c) => <span className="tabular-nums">{formatCurrency(Number(c.getValue()) || 0)}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor('convRate', {
      id: 'txc',
      header: 'Taxa conv.',
      cell: (c) => {
        const v = c.getValue()
        return <span className="tabular-nums">{v != null ? formatPercent(Number(v)) : '—'}</span>
      },
      sortingFn: (a, b, col) => {
        const x = a.getValue(col) ?? -1
        const y = b.getValue(col) ?? -1
        return Number(x) - Number(y)
      },
    }),
    columnHelper.accessor('conversions', {
      id: 'conv',
      header: 'Conversões',
      cell: (c) => {
        const v = Number(c.getValue()) || 0
        const s =
          Math.abs(v % 1) < 0.001
            ? formatNumber(Math.round(v))
            : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v)
        return <span className="tabular-nums">{s}</span>
      },
      sortingFn: 'basic',
    }),
    columnHelper.accessor('costPerConversion', {
      id: 'cpconv',
      header: 'Custo/conv.',
      cell: (c) => {
        const v = c.getValue()
        return <span className="tabular-nums">{v != null ? formatCurrency(Number(v)) : '—'}</span>
      },
      sortingFn: (a, b, col) => {
        const x = a.getValue(col)
        const y = b.getValue(col)
        if (x == null && y == null) return 0
        if (x == null) return 1
        if (y == null) return -1
        return Number(x) - Number(y)
      },
    }),
  ]
}

export function GoogleAdsDemographicsBlock() {
  const { loading, data } = usePlatformOverview()
  const demo = data?.demographics
  const [tab, setTab] = useState('age')
  const [primaryMetric, setPrimaryMetric] = useState('conversions')
  const [secondaryMetric, setSecondaryMetric] = useState('costPerConversion')
  const [showTable, setShowTable] = useState(false)

  const rows = useMemo(() => {
    const t = demo?.[tab]
    return Array.isArray(t?.items) ? t.items : []
  }, [demo, tab])

  const tabError = typeof demo?.[tab]?.error === 'string' ? demo[tab].error : ''

  useEffect(() => {
    if (primaryMetric === secondaryMetric) {
      const alt = CHART_METRICS.find((m) => m.id !== primaryMetric)
      if (alt) setSecondaryMetric(alt.id)
    }
  }, [primaryMetric, secondaryMetric])

  const chartData = useMemo(() => {
    const p = metricDef(primaryMetric)
    const s = metricDef(secondaryMetric)
    return rows.map((r) => {
      const pv = p.get(r)
      const sv = s.get(r)
      return {
        name: r.segmentLabel,
        primaryRaw: pv,
        secondaryRaw: sv,
        primary: Number(pv) || 0,
        secondary: Number(sv) || 0,
      }
    })
  }, [rows, primaryMetric, secondaryMetric])

  const columns = useMemo(() => buildTableColumns(tab), [tab])
  const [sorting, setSorting] = useState([])

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.segmentKey,
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="shrink-0 border-b border-surface-border px-3 py-3 sm:px-4">
        <h3 className="section-title">Informações demográficas</h3>
        <p className="mt-0.5 text-[10px] text-muted-foreground font-sans">Público-alvo no Google Ads · período do filtro</p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1 border-b border-surface-border px-2 py-2 sm:px-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-[10px] font-sans font-medium transition-colors',
              tab === t.id
                ? 'bg-brand/20 text-brand ring-1 ring-brand/40'
                : 'text-muted-foreground hover:bg-surface-input hover:text-white'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border px-2 py-2 sm:px-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={primaryMetric}
            onChange={(e) => setPrimaryMetric(e.target.value)}
            className="rounded-md border border-surface-border bg-[#141414] py-1 pl-2 pr-7 text-[10px] text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Métrica principal do gráfico"
          >
            {CHART_METRICS.map((m) => (
              <option key={`p-${m.id}`} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={secondaryMetric}
            onChange={(e) => setSecondaryMetric(e.target.value)}
            className="rounded-md border border-surface-border bg-[#141414] py-1 pl-2 pr-7 text-[10px] text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            aria-label="Métrica secundária do gráfico"
          >
            {CHART_METRICS.map((m) => (
              <option key={`s-${m.id}`} value={m.id} disabled={m.id === primaryMetric}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-[#141414] text-muted-foreground transition-colors hover:bg-surface-input hover:text-white',
            showTable && 'border-brand/50 text-brand'
          )}
          title={showTable ? 'Ocultar tabela' : 'Ver tabela detalhada'}
          aria-pressed={showTable}
          aria-label={showTable ? 'Ocultar tabela' : 'Ver tabela detalhada'}
        >
          {showTable ? <ChevronUp size={16} strokeWidth={2} /> : <Table2 size={16} strokeWidth={2} />}
        </button>
      </div>

      {tabError ? (
        <p className="shrink-0 px-3 py-2 text-[10px] text-amber-400/90 sm:px-4">{tabError}</p>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-10 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando demografia…
        </div>
      ) : null}

      {!loading && rows.length === 0 && !tabError ? (
        <p className="px-3 py-6 text-center text-[11px] text-muted-foreground sm:px-4">
          Sem dados demográficos no período (campanhas podem não ter segmentação ou volume).
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="min-h-0 flex-1 shrink-0 px-2 pb-2 pt-1 sm:px-3">
          <div className="h-52 min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 9, fill: '#888' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={
                    <DemographicsChartTooltip
                      primaryId={primaryMetric}
                      secondaryId={secondaryMetric}
                    />
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="primary"
                  name={metricDef(primaryMetric).label}
                  fill="#4285F4"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  yAxisId="right"
                  dataKey="secondary"
                  name={metricDef(secondaryMetric).label}
                  fill="#f43f5e"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {showTable && !loading && rows.length > 0 ? (
        <div className="min-h-0 max-h-[280px] shrink-0 overflow-auto border-t border-surface-border">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-surface-border bg-surface-input">
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-2 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground sm:px-3',
                        header.column.id === 'dim' ? 'text-left' : 'text-right'
                      )}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className={cn(
                            'inline-flex w-full items-center gap-0.5',
                            header.column.id === 'dim' ? 'justify-start' : 'justify-end'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-surface-border/40 hover:bg-surface-hover/25">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-2 py-2 font-mono text-[11px] text-white sm:px-3',
                        cell.column.id === 'dim' ? 'text-left' : 'text-right tabular-nums'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
