import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Columns3, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const LS_VISIBILITY = 'p12_google_ads_campaign_types_columns'
const LS_SORT = 'p12_google_ads_campaign_types_sort'

function formatConvCount(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
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

const columnHelper = createColumnHelper()

const DEFAULT_VISIBILITY = {
  tipo: true,
  investimento: true,
  impressoes: true,
  cliques: true,
  cpc: true,
  ctr: true,
  conversoes: true,
  custoPorConversao: true,
  taxaConversao: true,
  valorPorConversao: false,
}

const DEFAULT_SORT = [{ id: 'investimento', desc: true }]

function normalizeApiRows(items) {
  if (!Array.isArray(items)) return []
  return items.map((r) => ({
    typeKey: String(r.typeKey ?? ''),
    typeLabel: String(r.typeLabel ?? r.typeKey ?? '—'),
    spend: Number(r.spend) || 0,
    impressions: Math.round(Number(r.impressions) || 0),
    clicks: Math.round(Number(r.clicks) || 0),
    conversions: Number(r.conversions) || 0,
    conversionsValue: Number(r.conversionsValue ?? r.conversions_value) || 0,
  }))
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

function buildColumns() {
  return [
    columnHelper.accessor('typeLabel', {
      id: 'tipo',
      header: 'Tipo',
      cell: (info) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-400" aria-hidden />
          <span className="truncate font-sans text-white" title={info.row.original.typeKey}>
            {info.getValue()}
          </span>
        </div>
      ),
      enableHiding: false,
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('spend', {
      id: 'investimento',
      header: 'Investimento',
      cell: (info) => <span className="tabular-nums">{formatCurrency(Number(info.getValue()) || 0)}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor('impressions', {
      id: 'impressoes',
      header: 'Impressões',
      cell: (info) => <span className="tabular-nums">{formatNumber(Math.round(Number(info.getValue()) || 0))}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor('clicks', {
      id: 'cliques',
      header: 'Cliques',
      cell: (info) => <span className="tabular-nums">{formatNumber(Math.round(Number(info.getValue()) || 0))}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor((row) => (row.clicks > 0 ? row.spend / row.clicks : null), {
      id: 'cpc',
      header: 'CPC',
      cell: (info) => {
        const v = info.getValue()
        return <span className="tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor((row) => (row.impressions > 0 ? (row.clicks / row.impressions) * 100 : null), {
      id: 'ctr',
      header: 'CTR',
      cell: (info) => {
        const v = info.getValue()
        return <span className="tabular-nums">{v != null ? formatPercent(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('conversions', {
      id: 'conversoes',
      header: 'Conversões',
      cell: (info) => <span className="tabular-nums">{formatConvCount(info.getValue())}</span>,
      sortingFn: 'basic',
    }),
    columnHelper.accessor((row) => (row.conversions > 0 ? row.spend / row.conversions : null), {
      id: 'custoPorConversao',
      header: 'Custo / conv.',
      cell: (info) => {
        const v = info.getValue()
        return <span className="tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor((row) => (row.clicks > 0 ? (row.conversions / row.clicks) * 100 : null), {
      id: 'taxaConversao',
      header: 'Taxa conv.',
      cell: (info) => {
        const v = info.getValue()
        return <span className="tabular-nums">{v != null ? formatPercent(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor((row) => (row.conversions > 0 ? row.conversionsValue / row.conversions : null), {
      id: 'valorPorConversao',
      header: 'Valor / conv.',
      cell: (info) => {
        const v = info.getValue()
        return <span className="tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
  ]
}

export function GoogleAdsCampaignTypesTable() {
  const { loading, data } = usePlatformOverview()
  const ct = data?.campaignTypes
  const rawItems = Array.isArray(ct?.items) ? ct.items : []
  const rows = useMemo(() => normalizeApiRows(rawItems), [rawItems])
  const err = typeof ct?.error === 'string' && ct.error.trim() ? ct.error.trim() : null

  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = readJsonLs(LS_VISIBILITY, null)
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_VISIBILITY, ...saved, tipo: true }
    }
    return { ...DEFAULT_VISIBILITY }
  })

  const [sorting, setSorting] = useState(() => {
    const saved = readJsonLs(LS_SORT, null)
    if (Array.isArray(saved) && saved.length > 0 && saved.every((s) => s && typeof s.id === 'string')) {
      return saved
    }
    return [...DEFAULT_SORT]
  })

  useEffect(() => {
    try {
      localStorage.setItem(LS_VISIBILITY, JSON.stringify(columnVisibility))
    } catch {
      /* ignore */
    }
  }, [columnVisibility])

  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT, JSON.stringify(sorting))
    } catch {
      /* ignore */
    }
  }, [sorting])

  const columns = useMemo(() => buildColumns(), [])

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.typeKey,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const toggleColumn = useCallback((columnId, visible) => {
    if (columnId === 'tipo') return
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
  }, [])

  return (
    <div className="flex min-h-0 h-full min-w-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-3 sm:px-4">
        <span className="section-title">Tipos de campanhas</span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-[#141414] px-2.5 py-1.5 text-[10px] font-sans text-white outline-none hover:bg-surface-input focus-visible:ring-2 focus-visible:ring-brand/40"
              aria-label="Mostrar ou ocultar colunas"
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
                const checked = col.getIsVisible()
                return (
                  <DropdownMenu.CheckboxItem
                    key={col.id}
                    className={cn(
                      'flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-[11px] font-sans text-white outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-input',
                      !canHide && 'opacity-70'
                    )}
                    checked={checked}
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
      {err ? <p className="shrink-0 px-3 py-2 text-[10px] text-amber-400/90 sm:px-4">{err}</p> : null}
      {loading ? (
        <div className="flex flex-1 items-center justify-center gap-2 py-12 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando tipos de campanha…
        </div>
      ) : null}
      {!loading && rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-[11px] text-muted-foreground sm:px-4">
          Nenhum tipo de campanha com métricas no período.
        </p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] text-xs">
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
                          'px-3 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground sm:px-4',
                          header.column.id === 'tipo' ? 'text-left' : 'text-right'
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              'inline-flex w-full items-center gap-1 font-medium uppercase tracking-wider',
                              header.column.id === 'tipo' ? 'justify-start' : 'justify-end ml-auto'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                            ) : (
                              <span className="inline-block h-3 w-3 shrink-0 opacity-30" aria-hidden />
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
                  className="border-b border-surface-border/50 transition-colors last:border-0 hover:bg-surface-hover/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-3 font-mono text-white sm:px-4',
                        cell.column.id === 'tipo' ? 'text-left' : 'text-right text-[11px]'
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
