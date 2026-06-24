import { useCallback, useEffect, useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  useReactTable,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDown, ArrowUp, Columns3, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'
import { BlockCard } from '@/components/ui/BlockCard'
import {
  GERAL_CLIENTS_PERIOD_MODES,
  META_CLIENTS_COLUMNS,
  GOOGLE_CLIENTS_COLUMNS,
  defaultColumnVisibility,
  mapMetaClientRow,
  mapGoogleClientRow,
} from '@/lib/geralPlatformClientsTable'

const DEFAULT_PAGE_SIZE = 15
const LS_PERIOD = (platform) => `p12_geral_${platform}_clients_period`
const LS_COLUMNS = (platform) => `p12_geral_${platform}_clients_columns`
const LS_SORT = (platform) => `p12_geral_${platform}_clients_sort`

function readJsonLs(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function readPeriodLs(platform) {
  try {
    const v = localStorage.getItem(LS_PERIOD(platform))?.trim()
    if (v && GERAL_CLIENTS_PERIOD_MODES.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'filter'
}

function formatConvCount(n) {
  const x = Number(n) || 0
  return Math.abs(x % 1) < 0.001
    ? formatNumber(Math.round(x))
    : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(x)
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

function formatRangeLabel(range) {
  if (!range?.since || !range?.until) return null
  try {
    const s = new Date(`${range.since}T12:00:00`)
    const u = new Date(`${range.until}T12:00:00`)
    if (range.since === range.until) {
      return format(s, "d 'de' MMM yyyy", { locale: ptBR })
    }
    return `${format(s, 'd MMM', { locale: ptBR })} – ${format(u, "d 'de' MMM yyyy", { locale: ptBR })}`
  } catch {
    return `${range.since} – ${range.until}`
  }
}

function buildMetaColumns(columnHelper) {
  return [
    columnHelper.display({
      id: 'idx',
      header: '#',
      cell: (info) => <span className="tabular-nums text-muted-foreground">{info.row.index + 1}</span>,
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor('conta', {
      id: 'conta',
      header: 'Conta',
      cell: (info) => (
        <span className="block max-w-[220px] truncate font-sans text-white" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
      enableHiding: false,
    }),
    columnHelper.accessor('investimento', {
      id: 'investimento',
      header: 'Investimento',
      cell: (info) => <span className="font-mono tabular-nums">{formatCurrency(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('resultado', {
      id: 'resultado',
      header: 'Resultado',
      cell: (info) => <span className="font-mono tabular-nums">{formatConvCount(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('custoPorResultado', {
      id: 'custoPorResultado',
      header: 'Custo / resultado',
      cell: (info) => {
        const v = info.getValue()
        return <span className="font-mono tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('impressoes', {
      id: 'impressoes',
      header: 'Impressões',
      cell: (info) => <span className="font-mono tabular-nums">{formatNumber(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('alcance', {
      id: 'alcance',
      header: 'Alcance',
      cell: (info) => <span className="font-mono tabular-nums">{formatNumber(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('cliques', {
      id: 'cliques',
      header: 'Cliques (link)',
      cell: (info) => <span className="font-mono tabular-nums">{formatNumber(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('leads', {
      id: 'leads',
      header: 'Leads',
      cell: (info) => <span className="font-mono tabular-nums">{formatConvCount(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('ctr', {
      id: 'ctr',
      header: 'CTR',
      cell: (info) => <span className="font-mono tabular-nums">{formatPercent(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('cpc', {
      id: 'cpc',
      header: 'CPC',
      cell: (info) => <span className="font-mono tabular-nums">{formatCurrency(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('cpm', {
      id: 'cpm',
      header: 'CPM',
      cell: (info) => <span className="font-mono tabular-nums">{formatCurrency(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('frequencia', {
      id: 'frequencia',
      header: 'Frequência',
      cell: (info) => <span className="font-mono tabular-nums">{(Number(info.getValue()) || 0).toFixed(2)}</span>,
      sortingFn: nullableNumberSort,
    }),
  ]
}

function buildGoogleColumns(columnHelper) {
  return [
    columnHelper.display({
      id: 'idx',
      header: '#',
      cell: (info) => <span className="tabular-nums text-muted-foreground">{info.row.index + 1}</span>,
      enableSorting: false,
      enableHiding: false,
    }),
    columnHelper.accessor('conta', {
      id: 'conta',
      header: 'Conta',
      cell: (info) => (
        <span className="block max-w-[220px] truncate font-sans text-white" title={info.getValue()}>
          {info.getValue()}
        </span>
      ),
      enableHiding: false,
    }),
    columnHelper.accessor('investimento', {
      id: 'investimento',
      header: 'Investimento',
      cell: (info) => <span className="font-mono tabular-nums">{formatCurrency(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('conversoes', {
      id: 'conversoes',
      header: 'Conversões',
      cell: (info) => <span className="font-mono tabular-nums">{formatConvCount(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('custoPorConversao', {
      id: 'custoPorConversao',
      header: 'Custo / conversão',
      cell: (info) => {
        const v = info.getValue()
        return <span className="font-mono tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('impressoes', {
      id: 'impressoes',
      header: 'Impressões',
      cell: (info) => <span className="font-mono tabular-nums">{formatNumber(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('cliques', {
      id: 'cliques',
      header: 'Cliques',
      cell: (info) => <span className="font-mono tabular-nums">{formatNumber(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('ctr', {
      id: 'ctr',
      header: 'CTR',
      cell: (info) => <span className="font-mono tabular-nums">{formatPercent(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('cpc', {
      id: 'cpc',
      header: 'CPC médio',
      cell: (info) => <span className="font-mono tabular-nums">{formatCurrency(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('taxaConversao', {
      id: 'taxaConversao',
      header: 'Taxa de conv.',
      cell: (info) => <span className="font-mono tabular-nums">{formatPercent(info.getValue())}</span>,
      sortingFn: nullableNumberSort,
    }),
    columnHelper.accessor('valorConversao', {
      id: 'valorConversao',
      header: 'Valor / conversão',
      cell: (info) => {
        const v = info.getValue()
        return <span className="font-mono tabular-nums">{v != null ? formatCurrency(v) : '—'}</span>
      },
      sortingFn: nullableNumberSort,
    }),
  ]
}

const PLATFORM_CONFIG = {
  meta: {
    title: 'Todos os clientes — Meta Ads',
    accentClass: 'text-blue-400',
    endpoint: '/api/admin/platform/meta-accounts-overview',
    columnDefs: META_CLIENTS_COLUMNS,
    buildColumns: buildMetaColumns,
    mapRow: mapMetaClientRow,
    defaultSort: [{ id: 'investimento', desc: true }],
  },
  google: {
    title: 'Todos os clientes — Google Ads',
    accentClass: 'text-[#4285F4]',
    endpoint: '/api/admin/platform/google-accounts-overview',
    columnDefs: GOOGLE_CLIENTS_COLUMNS,
    buildColumns: buildGoogleColumns,
    mapRow: mapGoogleClientRow,
    defaultSort: [{ id: 'investimento', desc: true }],
  },
}

export function GeralPlatformClientsTable({ platform }) {
  const cfg = PLATFORM_CONFIG[platform]
  const { user } = useAuth()
  const { dateRange } = useDashboardFilters()
  const [periodMode, setPeriodMode] = useState(() => readPeriodLs(platform))
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [range, setRange] = useState(null)
  const [rawRows, setRawRows] = useState([])

  const columnHelper = useMemo(() => createColumnHelper(), [])
  const columns = useMemo(() => cfg.buildColumns(columnHelper), [cfg, columnHelper])

  const [columnVisibility, setColumnVisibility] = useState(() =>
    readJsonLs(LS_COLUMNS(platform), defaultColumnVisibility(cfg.columnDefs))
  )
  const [sorting, setSorting] = useState(() => readJsonLs(LS_SORT(platform), cfg.defaultSort))

  const rows = useMemo(() => rawRows.map(cfg.mapRow), [rawRows, cfg])

  const overviewUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (periodMode === 'yesterday') {
      params.set('preset', 'yesterday')
    } else if (dateRange?.start && dateRange?.end) {
      params.set('since', format(dateRange.start, 'yyyy-MM-dd'))
      params.set('until', format(dateRange.end, 'yyyy-MM-dd'))
    }
    const qs = params.toString()
    return qs ? `${cfg.endpoint}?${qs}` : cfg.endpoint
  }, [cfg.endpoint, periodMode, dateRange?.start, dateRange?.end])

  useEffect(() => {
    if (user?.role !== 'super_admin') return
    let cancelled = false
    setLoading(true)
    setApiError('')
    fetch(overviewUrl, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
        if (cancelled) return
        setRawRows(Array.isArray(data.rows) ? data.rows : [])
        setRange(data.range ?? null)
        if (data.error) setApiError(String(data.error))
      })
      .catch((e) => {
        if (!cancelled) {
          setRawRows([])
          setApiError(e instanceof Error ? e.message : 'Erro ao carregar contas')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [overviewUrl, user?.role])

  useEffect(() => {
    try {
      localStorage.setItem(LS_COLUMNS(platform), JSON.stringify(columnVisibility))
    } catch {
      /* ignore */
    }
  }, [columnVisibility, platform])

  useEffect(() => {
    try {
      localStorage.setItem(LS_SORT(platform), JSON.stringify(sorting))
    } catch {
      /* ignore */
    }
  }, [sorting, platform])

  const onPeriodChange = (modeId) => {
    setPeriodMode(modeId)
    try {
      localStorage.setItem(LS_PERIOD(platform), modeId)
    } catch {
      /* ignore */
    }
  }

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
    usePagedRows(sortedRows, {
      storageKey: `p12_pagesize_geral_${platform}_clients`,
      defaultSize: DEFAULT_PAGE_SIZE,
    })

  const toggleColumn = useCallback((columnId, visible) => {
    if (columnId === 'conta' || columnId === 'idx') return
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }))
  }, [])

  const rangeLabel = formatRangeLabel(range)
  const periodTabs = (
    <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.06] bg-[#141414] p-1">
      {GERAL_CLIENTS_PERIOD_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPeriodChange(m.id)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[9px] font-medium font-sans whitespace-nowrap transition-colors',
            periodMode === m.id
              ? 'bg-brand/20 text-brand ring-1 ring-brand/30'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  )

  const columnPicker = (
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
          className="z-50 max-h-[min(70vh,320px)] min-w-[200px] overflow-y-auto rounded-md border border-surface-border bg-[#1a1a1a] p-1 shadow-xl"
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
  )

  if (user?.role !== 'super_admin') {
    return (
      <BlockCard
        title={cfg.title}
        state="empty"
        emptyMessage="Disponível para super administradores com credenciais Meta/Google no Worker."
        bodyClassName="py-6"
      />
    )
  }

  const badge = loading ? 'Carregando…' : `${total} contas`

  return (
    <BlockCard
      title={cfg.title}
      badge={badge}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {periodTabs}
          {columnPicker}
        </div>
      }
      state={loading ? 'loading' : rows.length === 0 && apiError ? 'error' : rows.length === 0 ? 'empty' : 'ready'}
      emptyMessage="Nenhuma conta com métricas no período selecionado."
      errorMessage={apiError}
      bodyClassName="flex min-h-0 flex-col overflow-hidden p-0"
    >
      {rangeLabel ? (
        <p className="border-b border-white/[0.06] px-4 py-2 text-[10px] text-muted-foreground font-sans">
          Período: <span className="font-mono text-foreground/85">{rangeLabel}</span>
          {periodMode === 'yesterday' ? (
            <span className="ml-2 rounded bg-brand/10 px-1.5 py-0.5 text-brand">Ontem</span>
          ) : null}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Carregando contas e métricas…
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[880px] text-xs">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-surface-border bg-surface-input/50">
                    {hg.headers.map((header) => {
                      if (!header.column.getIsVisible()) return null
                      const canSort = header.column.getCanSort()
                      const sorted = header.column.getIsSorted()
                      const alignLeft = header.column.id === 'conta' || header.column.id === 'idx'
                      return (
                        <th
                          key={header.id}
                          className={cn(
                            'px-3 py-2 text-[10px] font-sans font-medium uppercase tracking-wider text-muted-foreground sm:px-4',
                            alignLeft ? 'text-left' : 'text-right'
                          )}
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              className={cn(
                                'inline-flex w-full items-center gap-0.5',
                                alignLeft ? 'justify-start' : 'justify-end'
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
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-surface-border/50 last:border-0 hover:bg-surface-hover/40"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const alignLeft = cell.column.id === 'conta' || cell.column.id === 'idx'
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-3 py-2.5 sm:px-4',
                            alignLeft ? 'text-left' : 'text-right text-white/90'
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            pageSize={pageSize}
            onPageSize={setPageSize}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            className="border-t border-surface-border px-4 py-2.5"
          />
        </>
      ) : null}
    </BlockCard>
  )
}

export function GeralMetaClientsTable() {
  return <GeralPlatformClientsTable platform="meta" />
}

export function GeralGoogleClientsTable() {
  return <GeralPlatformClientsTable platform="google" />
}
