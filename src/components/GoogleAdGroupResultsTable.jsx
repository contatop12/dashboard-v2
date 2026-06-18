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
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

const PAGE_SIZE = 15
const LS_VISIBILITY = 'p12_google_ads_ad_group_results_columns'
const LS_SORT = 'p12_google_ads_ad_group_results_sort'

function readJsonLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function formatConvCount(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
}

function flattenAdGroupsFromTree(tree) {
  if (!Array.isArray(tree)) return []
  const rows = []
  for (const camp of tree) {
    for (const ag of camp.adsets ?? []) {
      const m = ag.metrics || {}
      const spend = Number(m.spend) || 0
      const impressions = Math.round(Number(m.impressions) || 0)
      const clicks = Math.round(Number(m.clicks) || 0)
      const conversions = Number(m.results) || 0
      if (impressions === 0 && clicks === 0 && spend === 0 && conversions === 0) continue
      rows.push({
        id: String(ag.id),
        name: String(ag.name || `Grupo ${ag.id}`),
        campaignName: String(camp.name || ''),
        spend,
        impressions,
        clicks,
        conversions,
      })
    }
  }
  return rows
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

const DEFAULT_VISIBILITY = {
  grupo: true,
  impressoes: true,
  cliques: true,
  cpc: true,
  ctr: true,
  conversoes: true,
  custoPorConversao: true,
  taxaConversao: true,
  custo: true,
}

const DEFAULT_SORT = [{ id: 'cliques', desc: true }]

const columnHelper = createColumnHelper()

function buildColumns() {
  return [
    columnHelper.display({
      id: 'idx',
      header: '#',
      cell: (info) => (
        <span className="tabular-nums text-muted-foreground">{info.row.index + 1}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor('name', {
      id: 'grupo',
      header: 'Grupo de anúncios',
      cell: (info) => (
        <span className="block max-w-[220px] truncate font-sans text-white" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
      enableHiding: false,
      sortingFn: 'alphanumeric',
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
      header: 'Custo/conv.',
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
    columnHelper.accessor('spend', {
      id: 'custo',
      header: 'Custo',
      cell: (info) => <span className="tabular-nums">{formatCurrency(Number(info.getValue()) || 0)}</span>,
      sortingFn: 'basic',
    }),
  ]
}

export function GoogleAdGroupResultsTable() {
  const { loading, data } = usePlatformOverview()
  const rows = useMemo(() => flattenAdGroupsFromTree(data?.campaignTree), [data?.campaignTree])
  const err = typeof data?.campaignsError === 'string' && data.campaignsError.trim() ? data.campaignsError.trim() : null

  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = readJsonLs(LS_VISIBILITY, null)
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_VISIBILITY, ...saved, grupo: true, idx: true }
    }
    return { ...DEFAULT_VISIBILITY, idx: true }
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

  useEffect(() => {
    setPage(1)
  }, [rows.length, sorting])

  const columns = useMemo(() => buildColumns(), [])

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const sortedRows = table.getRowModel().rows
  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(sortedRows, { storageKey: 'p12_pagesize_ad_groups', defaultSize: PAGE_SIZE })

  const toggleColumn = useCallback((columnId, visible) => {
    if (columnId === 'grupo' || columnId === 'idx') return
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
  }, [])

  return (
    <div className="flex min-h-0 h-full min-w-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-card">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <span className="section-title">Resultados por grupos de anúncios</span>
          <p className="mt-0.5 text-[10px] text-muted-foreground font-sans">Período selecionado no filtro de datas</p>
        </div>
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
          Carregando grupos de anúncios…
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="px-3 py-6 text-center text-[11px] text-muted-foreground sm:px-4">
          Nenhum grupo de anúncios com métricas no período.
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
                          'px-3 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground sm:px-4',
                          header.column.id === 'grupo' || header.column.id === 'idx' ? 'text-left' : 'text-right'
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className={cn(
                              'inline-flex w-full items-center gap-0.5',
                              header.column.id === 'grupo' || header.column.id === 'idx'
                                ? 'justify-start'
                                : 'justify-end'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp size={10} className="text-brand" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown size={10} className="text-brand" />
                            ) : null}
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
              {pageRows.map((row, i) => (
                <tr key={row.id} className="border-b border-surface-border/40 hover:bg-surface-hover/25">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-3 py-2 font-mono text-[11px] text-white sm:px-4',
                        cell.column.id === 'grupo' || cell.column.id === 'idx'
                          ? 'text-left'
                          : 'text-right tabular-nums'
                      )}
                    >
                      {cell.column.id === 'idx'
                        ? rangeStart + i
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          pageSize={pageSize}
          onPageSize={setPageSize}
          total={total}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          className="border-t border-surface-border px-3 py-2 sm:px-4"
        />
      ) : null}
    </div>
  )
}
