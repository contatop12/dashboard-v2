import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDown, ArrowUp, Columns3, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const BAR_COLORS = {
  impressoes: '#4A9BFF',
  cliques: '#22d3ee',
  cpc: '#e879f9',
  ctr: '#fb923c',
  conversoes: '#fbbf24',
  custoPorConversao: '#22c55e',
  taxaConversao: '#a78bfa',
  custo: '#3b82f6',
  valorPorConversao: '#34d399',
}

function lsKey(platform, suffix) {
  return `p12_monthly_results_${platform}_${suffix}`
}

function readJsonLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function monthLabelPt(ym) {
  try {
    const d = parse(`${ym}-01`, 'yyyy-MM-dd', new Date())
    const m = format(d, 'MMM', { locale: ptBR }).replace('.', '')
    const y = format(d, 'yyyy', { locale: ptBR })
    return `${m} de ${y}`
  } catch {
    return ym
  }
}

function formatConvCount(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function aggregateGoogleByMonth(daily) {
  if (!Array.isArray(daily)) return []
  const map = new Map()
  for (const d of daily) {
    const date = String(d.date ?? '').trim()
    if (!date || date.length < 7) continue
    const ym = date.slice(0, 7)
    const cur = map.get(ym) ?? {
      monthKey: ym,
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      conversionsValue: 0,
    }
    cur.impressions += Math.round(Number(d.impressions) || 0)
    cur.clicks += Math.round(Number(d.clicks) || 0)
    cur.spend += Number(d.spend) || 0
    cur.conversions += Number(d.conversions) || 0
    cur.conversionsValue += Number(d.conversionsValue ?? d.conversions_value) || 0
    map.set(ym, cur)
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      monthLabel: monthLabelPt(r.monthKey),
      cpc: r.clicks > 0 ? r.spend / r.clicks : null,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : null,
      custoPorConversao: r.conversions > 0 ? r.spend / r.conversions : null,
      taxaConversao: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : null,
      valorPorConversao: r.conversions > 0 ? r.conversionsValue / r.conversions : null,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

function aggregateMetaByMonth(daily) {
  if (!Array.isArray(daily)) return []
  const map = new Map()
  for (const d of daily) {
    const date = String(d.date ?? '').trim()
    if (!date || date.length < 7) continue
    const ym = date.slice(0, 7)
    const cur = map.get(ym) ?? {
      monthKey: ym,
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      conversionsValue: 0,
    }
    cur.impressions += Math.round(Number(d.impressions) || 0)
    cur.clicks += Math.round(Number(d.clicks) || 0)
    cur.spend += Number(d.spend) || 0
    cur.conversions += Math.round(Number(d.leads) || 0)
    cur.conversionsValue += 0
    map.set(ym, cur)
  }
  return [...map.values()]
    .map((r) => ({
      ...r,
      monthLabel: monthLabelPt(r.monthKey),
      cpc: r.clicks > 0 ? r.spend / r.clicks : null,
      ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : null,
      custoPorConversao: r.conversions > 0 ? r.spend / r.conversions : null,
      taxaConversao: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : null,
      valorPorConversao: null,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
}

function computeColumnMaxes(rows) {
  const m = {
    impressions: 0,
    clicks: 0,
    spend: 0,
    conversions: 0,
    cpc: 0,
    ctr: 0,
    custoPorConversao: 0,
    taxaConversao: 0,
    valorPorConversao: 0,
  }
  for (const r of rows) {
    m.impressions = Math.max(m.impressions, r.impressions)
    m.clicks = Math.max(m.clicks, r.clicks)
    m.spend = Math.max(m.spend, r.spend)
    m.conversions = Math.max(m.conversions, r.conversions)
    if (r.cpc != null && !Number.isNaN(r.cpc)) m.cpc = Math.max(m.cpc, r.cpc)
    if (r.ctr != null && !Number.isNaN(r.ctr)) m.ctr = Math.max(m.ctr, r.ctr)
    if (r.custoPorConversao != null && !Number.isNaN(r.custoPorConversao))
      m.custoPorConversao = Math.max(m.custoPorConversao, r.custoPorConversao)
    if (r.taxaConversao != null && !Number.isNaN(r.taxaConversao))
      m.taxaConversao = Math.max(m.taxaConversao, r.taxaConversao)
    if (r.valorPorConversao != null && !Number.isNaN(r.valorPorConversao))
      m.valorPorConversao = Math.max(m.valorPorConversao, r.valorPorConversao)
  }
  return m
}

function buildFooterTotals(rows, platform) {
  const t = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      spend: acc.spend + r.spend,
      conversions: acc.conversions + r.conversions,
      conversionsValue: acc.conversionsValue + (r.conversionsValue || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionsValue: 0 }
  )
  return {
    ...t,
    cpc: t.clicks > 0 ? t.spend / t.clicks : null,
    ctr: t.impressions > 0 ? (t.clicks / t.impressions) * 100 : null,
    custoPorConversao: t.conversions > 0 ? t.spend / t.conversions : null,
    taxaConversao: t.clicks > 0 ? (t.conversions / t.clicks) * 100 : null,
    valorPorConversao:
      platform === 'google' && t.conversions > 0 ? t.conversionsValue / t.conversions : null,
  }
}

function SparkMetric({ value, display, barKey, maxes }) {
  const max = maxes[barKey] || 0
  const pct = max > 0 && value != null && !Number.isNaN(value) ? Math.min(100, (Number(value) / max) * 100) : 0
  const color = BAR_COLORS[barKey] ?? '#888'
  return (
    <div className="flex min-w-[76px] flex-col items-end gap-0.5">
      <span className="whitespace-nowrap text-[11px] font-mono tabular-nums text-white">{display}</span>
      <div className="h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function nullableNumberSort(rowA, rowB, columnId) {
  const a = rowA.getValue(columnId)
  const b = rowB.getValue(columnId)
  const na = a == null || Number.isNaN(Number(a))
  const nb = b == null || Number.isNaN(Number(b))
  if (na && nb) return 0
  if (na) return 1
  if (nb) return -1
  return Number(a) === Number(b) ? 0 : Number(a) > Number(b) ? 1 : -1
}

const columnHelper = createColumnHelper()

function buildColumns(platform) {
  const convHeader = platform === 'meta' ? 'Leads' : 'Conversões'
  const custoHeader = platform === 'meta' ? 'Custo / lead' : 'Custo / conv.'
  const taxaHeader = platform === 'meta' ? 'Taxa leads' : 'Taxa conv.'

  return [
    columnHelper.accessor('monthKey', {
      id: 'mes',
      header: 'Mês e ano',
      cell: (info) => (
        <span className="font-sans text-[11px] text-white">{info.row.original.monthLabel}</span>
      ),
      sortingFn: 'alphanumeric',
      enableHiding: false,
    }),
    columnHelper.accessor('impressions', {
      id: 'impressoes',
      header: 'Impressões',
      cell: (info) => {
        const v = Number(info.getValue()) || 0
        return (
          <SparkMetric
            value={v}
            display={formatNumber(Math.round(v))}
            barKey="impressions"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: 'basic',
    }),
    columnHelper.accessor('clicks', {
      id: 'cliques',
      header: 'Cliques',
      cell: (info) => {
        const v = Number(info.getValue()) || 0
        return (
          <SparkMetric
            value={v}
            display={formatNumber(Math.round(v))}
            barKey="clicks"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: 'basic',
    }),
    columnHelper.accessor('cpc', {
      id: 'cpc',
      header: 'CPC',
      cell: (info) => {
        const v = info.getValue()
        return (
          <SparkMetric
            value={v}
            display={v != null ? formatCurrency(v) : '—'}
            barKey="cpc"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('ctr', {
      id: 'ctr',
      header: 'CTR',
      cell: (info) => {
        const v = info.getValue()
        return (
          <SparkMetric
            value={v}
            display={v != null ? formatPercent(v) : '—'}
            barKey="ctr"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('conversions', {
      id: 'conversoes',
      header: convHeader,
      cell: (info) => {
        const v = Number(info.getValue()) || 0
        return (
          <SparkMetric
            value={v}
            display={formatConvCount(v)}
            barKey="conversions"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: 'basic',
    }),
    columnHelper.accessor('custoPorConversao', {
      id: 'custoPorConversao',
      header: custoHeader,
      cell: (info) => {
        const v = info.getValue()
        return (
          <SparkMetric
            value={v}
            display={v != null ? formatCurrency(v) : '—'}
            barKey="custoPorConversao"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('taxaConversao', {
      id: 'taxaConversao',
      header: taxaHeader,
      cell: (info) => {
        const v = info.getValue()
        return (
          <SparkMetric
            value={v}
            display={v != null ? formatPercent(v) : '—'}
            barKey="taxaConversao"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('spend', {
      id: 'custo',
      header: 'Custo',
      cell: (info) => {
        const v = Number(info.getValue()) || 0
        return (
          <SparkMetric
            value={v}
            display={formatCurrency(v)}
            barKey="spend"
            maxes={info.table.options.meta?.maxes ?? {}}
          />
        )
      },
      sortingFn: 'basic',
    }),
    ...(platform === 'google'
      ? [
          columnHelper.accessor('valorPorConversao', {
            id: 'valorPorConversao',
            header: 'Valor / conv.',
            cell: (info) => {
              const v = info.getValue()
              return (
                <SparkMetric
                  value={v}
                  display={v != null ? formatCurrency(v) : '—'}
                  barKey="valorPorConversao"
                  maxes={info.table.options.meta?.maxes ?? {}}
                />
              )
            },
            sortingFn: nullableNumberSort,
          }),
        ]
      : []),
  ]
}

const DEFAULT_VISIBILITY = {
  mes: true,
  impressoes: true,
  cliques: true,
  cpc: true,
  ctr: true,
  conversoes: true,
  custoPorConversao: true,
  taxaConversao: true,
  custo: true,
  valorPorConversao: false,
}

const DEFAULT_SORT = [{ id: 'mes', desc: true }]

export function MonthlyAccountResultsTable({ platform }) {
  const { loading, data } = usePlatformOverview()
  const daily = data?.daily

  const rows = useMemo(() => {
    if (platform === 'meta') return aggregateMetaByMonth(daily)
    return aggregateGoogleByMonth(daily)
  }, [daily, platform])

  const maxes = useMemo(() => computeColumnMaxes(rows), [rows])
  const footer = useMemo(() => buildFooterTotals(rows, platform), [rows, platform])

  const footerMaxes = useMemo(() => {
    const m = { ...maxes }
    const bump = (k, v) => {
      if (v != null && !Number.isNaN(v)) m[k] = Math.max(m[k] || 0, v)
    }
    bump('impressions', footer.impressions)
    bump('clicks', footer.clicks)
    bump('spend', footer.spend)
    bump('conversions', footer.conversions)
    bump('cpc', footer.cpc)
    bump('ctr', footer.ctr)
    bump('custoPorConversao', footer.custoPorConversao)
    bump('taxaConversao', footer.taxaConversao)
    bump('valorPorConversao', footer.valorPorConversao)
    return m
  }, [maxes, footer])

  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = readJsonLs(lsKey(platform, 'columns'), null)
    if (saved && typeof saved === 'object') {
      const next = { ...DEFAULT_VISIBILITY, ...saved, mes: true }
      if (platform === 'meta') next.valorPorConversao = false
      return next
    }
    return { ...DEFAULT_VISIBILITY, valorPorConversao: platform === 'google' ? false : false }
  })

  const [sorting, setSorting] = useState(() => {
    const saved = readJsonLs(lsKey(platform, 'sort'), null)
    if (Array.isArray(saved) && saved.length > 0 && saved.every((s) => s && typeof s.id === 'string')) {
      return saved
    }
    return [...DEFAULT_SORT]
  })

  useEffect(() => {
    try {
      localStorage.setItem(lsKey(platform, 'columns'), JSON.stringify(columnVisibility))
    } catch {
      /* ignore */
    }
  }, [platform, columnVisibility])

  useEffect(() => {
    try {
      localStorage.setItem(lsKey(platform, 'sort'), JSON.stringify(sorting))
    } catch {
      /* ignore */
    }
  }, [platform, sorting])

  const columns = useMemo(() => buildColumns(platform), [platform])

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.monthKey,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta: { maxes },
  })

  const toggleColumn = useCallback((columnId, visible) => {
    if (columnId === 'mes') return
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
  }, [])

  const renderFooterCell = (colId) => {
    if (colId === 'mes') {
      return <span className="font-sans text-[11px] font-semibold text-white">Total geral</span>
    }
    if (colId === 'impressoes') {
      return (
        <SparkMetric
          value={footer.impressions}
          display={formatNumber(Math.round(footer.impressions))}
          barKey="impressions"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'cliques') {
      return (
        <SparkMetric
          value={footer.clicks}
          display={formatNumber(Math.round(footer.clicks))}
          barKey="clicks"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'cpc') {
      return (
        <SparkMetric
          value={footer.cpc}
          display={footer.cpc != null ? formatCurrency(footer.cpc) : '—'}
          barKey="cpc"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'ctr') {
      return (
        <SparkMetric
          value={footer.ctr}
          display={footer.ctr != null ? formatPercent(footer.ctr) : '—'}
          barKey="ctr"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'conversoes') {
      return (
        <SparkMetric
          value={footer.conversions}
          display={formatConvCount(footer.conversions)}
          barKey="conversions"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'custoPorConversao') {
      return (
        <SparkMetric
          value={footer.custoPorConversao}
          display={footer.custoPorConversao != null ? formatCurrency(footer.custoPorConversao) : '—'}
          barKey="custoPorConversao"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'taxaConversao') {
      return (
        <SparkMetric
          value={footer.taxaConversao}
          display={footer.taxaConversao != null ? formatPercent(footer.taxaConversao) : '—'}
          barKey="taxaConversao"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'custo') {
      return (
        <SparkMetric
          value={footer.spend}
          display={formatCurrency(footer.spend)}
          barKey="spend"
          maxes={footerMaxes}
        />
      )
    }
    if (colId === 'valorPorConversao') {
      return (
        <SparkMetric
          value={footer.valorPorConversao}
          display={footer.valorPorConversao != null ? formatCurrency(footer.valorPorConversao) : '—'}
          barKey="valorPorConversao"
          maxes={footerMaxes}
        />
      )
    }
    return '—'
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-3 sm:px-4">
        <span className="section-title">Resultados mensais da conta</span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-[#141414] px-2.5 py-1.5 text-[10px] font-sans text-white outline-none hover:bg-surface-input focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Colunas da tabela mensal"
            >
              <Columns3 size={12} strokeWidth={2} className="text-muted-foreground" />
              Colunas
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[200px] rounded-md border border-surface-border bg-[#1a1a1a] p-1 shadow-xl"
              sideOffset={6}
              align="end"
            >
              {table.getAllLeafColumns().map((col) => {
                const canHide = col.getCanHide()
                return (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    className={cn(
                      'flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-[11px] font-sans text-white outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-input',
                      !canHide && 'opacity-70'
                    )}
                    checked={col.getIsVisible()}
                    disabled={!canHide}
                    onCheckedChange={(v) => toggleColumn(col.id, v === true)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
                  </DropdownMenu.CheckboxItem>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-12 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando série mensal…
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="px-3 py-8 text-center text-[11px] text-muted-foreground sm:px-4">
          Sem dados diários no período para montar os meses.
        </p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[880px] text-xs">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-surface-border bg-surface-input">
                  {hg.headers.map((header) => {
                    if (!header.column.getIsVisible()) return null
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'px-2 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground sm:px-3',
                          header.column.id === 'mes' ? 'text-left' : 'text-right'
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              'inline-flex w-full items-center gap-0.5 font-medium uppercase tracking-wider',
                              header.column.id === 'mes' ? 'justify-start' : 'justify-end'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                            ) : (
                              <span className="inline-block h-3 w-3 shrink-0 opacity-25" aria-hidden />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-surface-border/40 transition-colors hover:bg-surface-hover/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-2 py-2 align-top sm:px-3',
                        cell.column.id === 'mes' ? 'text-left' : 'text-right'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-surface-border bg-surface-input/90">
                {table.getVisibleLeafColumns().map((col) => (
                  <td
                    key={`ft-${col.id}`}
                    className={cn(
                      'px-2 py-2.5 align-top sm:px-3',
                      col.id === 'mes' ? 'text-left' : 'text-right'
                    )}
                  >
                    {renderFooterCell(col.id)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  )
}
