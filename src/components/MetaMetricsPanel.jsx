import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { Switch } from '@/components/ui/Switch'
import {
  META_CONVERSION_OPTIONS,
  META_METRIC_DEFS,
  META_METRIC_TIER_LABEL,
  META_ADDABLE_METRICS,
} from '@/lib/metaMetricsConfig'
import {
  readMetaConversionType,
  writeMetaConversionType,
  readMetaMetricsVisibility,
  writeMetaMetricsVisibility,
  resetMetaMetricsVisibility,
} from '@/lib/metaMetricsPreferences'
import { buildMetaMetricsView } from '@/lib/metaMetricsCompute'

function MetricTile({ label, data, large = false }) {
  const hasDelta = data?.deltaPct !== null && data?.deltaPct !== undefined && !Number.isNaN(Number(data?.deltaPct))
  const n = Number(data?.deltaPct)
  const isPos = hasDelta && n > 0
  const isNeg = hasDelta && n < 0

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-lg border border-white/[0.06] bg-surface-card/90 px-3 py-3',
        large && 'min-h-[5.5rem] justify-center'
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      <span className={cn('font-mono font-semibold tabular-nums text-foreground', large ? 'text-xl' : 'text-base')}>
        {data?.value ?? '—'}
      </span>
      {data?.hint ? (
        <span className="text-[10px] text-muted-foreground/80">{data.hint}</span>
      ) : null}
      {hasDelta ? (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 font-mono text-[10px]',
            isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-muted-foreground'
          )}
        >
          {isPos ? <TrendingUp size={10} /> : isNeg ? <TrendingDown size={10} /> : null}
          {n >= 0 ? '+' : ''}
          {n.toFixed(1)}%
        </span>
      ) : null}
    </div>
  )
}

function VideoRetentionPanel({ data }) {
  const items = [
    { pct: '25%', value: data?.p25 ?? 0 },
    { pct: '50%', value: data?.p50 ?? 0 },
    { pct: '75%', value: data?.p75 ?? 0 },
    { pct: '100%', value: data?.p100 ?? 0 },
  ]
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="rounded-lg border border-white/[0.06] bg-surface-card/90 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Retenção de vídeo
        </span>
      </div>
      <p className="mb-4 text-[10px] text-muted-foreground">
        Reproduções que atingiram 25%, 50%, 75% e 100% do vídeo
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.pct} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-lg font-semibold text-foreground">{formatNumber(item.value)}</span>
              <span className="text-[10px] font-semibold text-brand">{item.pct}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomizePanel({ visibility, onChange, onReset }) {
  const tiers = ['primary', 'secondary', 'panel']

  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#141414] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Exibir / ocultar métricas</span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-brand hover:text-brand/80"
        >
          Restaurar padrão
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {tiers.map((tier) => {
          const keys = Object.entries(META_METRIC_DEFS).filter(([, d]) => d.tier === tier)
          return (
            <div key={tier}>
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {META_METRIC_TIER_LABEL[tier]}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {keys.map(([key, def]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-surface-card px-3 py-2.5"
                  >
                    <span className="text-[11px] text-foreground">{def.label}</span>
                    <Switch
                      size="sm"
                      checked={!!visibility[key]}
                      onCheckedChange={(on) => onChange({ ...visibility, [key]: on })}
                      aria-label={def.label}
                    />
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Adicionar métrica
        </p>
        <div className="flex flex-wrap gap-2">
          {META_ADDABLE_METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              disabled={!!visibility[m.key]}
              onClick={() => onChange({ ...visibility, [m.key]: true })}
              className="rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-40"
            >
              + {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MetaMetricsPanel() {
  const { loading, data } = usePlatformOverview()
  const { comparePrimaryKpi } = useDashboardFilters()
  const [conversionId, setConversionId] = useState(readMetaConversionType)
  const [visibility, setVisibility] = useState(readMetaMetricsVisibility)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const view = useMemo(
    () =>
      buildMetaMetricsView(
        data?.metaMetricsRaw,
        data?.metaMetricsCompareRaw,
        conversionId,
        comparePrimaryKpi
      ),
    [data?.metaMetricsRaw, data?.metaMetricsCompareRaw, conversionId, comparePrimaryKpi]
  )

  const qualityText = data?.qualityRanking ?? 'Sem ranking no período'

  const primaryKeys = Object.keys(META_METRIC_DEFS).filter(
    (k) => META_METRIC_DEFS[k].tier === 'primary' && visibility[k] && view.primary[k]
  )
  const secondaryKeys = [
    ...Object.keys(META_METRIC_DEFS).filter(
      (k) => META_METRIC_DEFS[k].tier === 'secondary' && visibility[k] && view.secondary[k]
    ),
    ...META_ADDABLE_METRICS.map((m) => m.key).filter((k) => visibility[k] && view.secondary[k]),
  ]

  const onConversionChange = (id) => {
    setConversionId(id)
    writeMetaConversionType(id)
  }

  const onVisibilityChange = (next) => {
    setVisibility(next)
    writeMetaMetricsVisibility(next)
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-surface-card p-6">
        <p className="text-xs text-muted-foreground">Carregando métricas…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-white/[0.06] bg-[#121212] p-4 sm:p-5">
      {/* Conversão + personalizar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Conversão
          </span>
          <select
            value={conversionId}
            onChange={(e) => onConversionChange(e.target.value)}
            className="w-full max-w-md rounded-lg border border-surface-border bg-surface-input px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {META_CONVERSION_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCustomizeOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Personalizar métricas
          {customizeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {customizeOpen ? (
        <CustomizePanel
          visibility={visibility}
          onChange={onVisibilityChange}
          onReset={() => onVisibilityChange(resetMetaMetricsVisibility())}
        />
      ) : null}

      {/* Primárias */}
      {primaryKeys.length > 0 ? (
        <section>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Primárias
          </p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {primaryKeys.map((key) => (
              <MetricTile
                key={key}
                label={META_METRIC_DEFS[key]?.label ?? key}
                data={view.primary[key]}
                large
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Secundárias */}
      {secondaryKeys.length > 0 ? (
        <section>
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            Secundárias
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {secondaryKeys.map((key) => {
              const def = META_METRIC_DEFS[key] ?? META_ADDABLE_METRICS.find((m) => m.key === key)
              return (
                <MetricTile
                  key={key}
                  label={def?.label ?? key}
                  data={view.secondary[key]}
                />
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Painéis */}
      {visibility.videoRetention && view.panels.videoRetention ? (
        <VideoRetentionPanel data={view.panels.videoRetention} />
      ) : null}

      {visibility.qualityRanking ? (
        <div className="rounded-lg border border-white/[0.06] bg-surface-card/90 px-4 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Índice de qualidade (Meta)
          </p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">{qualityText}</p>
        </div>
      ) : null}
    </div>
  )
}
