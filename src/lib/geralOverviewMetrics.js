import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'

const COMPACT_CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 2,
})

function deltaPct(current, previous) {
  const c = Number(current)
  const p = Number(previous)
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null
  return ((c - p) / Math.abs(p)) * 100
}

function deriveFromTotals(totals) {
  if (!totals) {
    return {
      investimento: 0,
      resultado: 0,
      custoResultado: null,
      retorno: 0,
      impressoes: 0,
      cliques: 0,
      cpm: 0,
      ctr: 0,
    }
  }
  const spend = Number(totals.spend) || 0
  const results = Number(totals.results) || 0
  const impressions = Number(totals.impressions) || 0
  const clicks = Number(totals.clicks) || 0
  const conversionValue = Number(totals.conversionValue) || 0
  return {
    investimento: spend,
    resultado: results,
    custoResultado: results > 0 ? spend / results : null,
    retorno: conversionValue,
    impressoes: impressions,
    cliques: clicks,
    cpm: impressions > 0 ? spend / (impressions / 1000) : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  }
}

function formatHeroValue(id, value) {
  if (id === 'investimento' || id === 'retorno') {
    return Math.abs(value) >= 1000 ? COMPACT_CURRENCY.format(value) : formatCurrency(value)
  }
  if (id === 'custoResultado') return value != null ? formatCurrency(value) : '—'
  if (id === 'resultado') {
    return Math.abs(value % 1) < 0.001
      ? formatNumber(Math.round(value))
      : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
  }
  return String(value)
}

function formatSecondaryValue(id, value) {
  if (id === 'impressoes' || id === 'cliques') return formatNumber(Math.round(value))
  if (id === 'cpm') return formatCurrency(value)
  if (id === 'ctr') return formatPercent(value)
  return String(value)
}

export function buildGeralMetricCells(data, { isPrevious, compareEnabled }) {
  const currentTotals = isPrevious ? data?.compareTotals : data?.totals
  const compareTotals = isPrevious ? null : compareEnabled ? data?.compareTotals : null
  const current = deriveFromTotals(currentTotals)
  const compare = compareTotals ? deriveFromTotals(compareTotals) : null
  const showDelta = compareEnabled && !isPrevious && compareTotals

  const heroIds = ['investimento', 'resultado', 'custoResultado', 'retorno']
  const secondaryIds = ['impressoes', 'cliques', 'cpm', 'ctr']

  const build = (id, formatter) => ({
    value: formatter(id, current[id]),
    deltaPct: showDelta && compare ? deltaPct(current[id] ?? 0, compare[id] ?? 0) : null,
  })

  return {
    hero: Object.fromEntries(heroIds.map((id) => [id, build(id, formatHeroValue)])),
    secondary: Object.fromEntries(secondaryIds.map((id) => [id, build(id, formatSecondaryValue)])),
  }
}

export function selectGeralDaily(data, isPrevious) {
  const daily = isPrevious ? data?.compareDaily : data?.daily
  return Array.isArray(daily) ? daily : []
}

export function mapGeralDailyForChart(daily) {
  return daily.map((d) => ({
    date: d.date,
    spend: Number(d.spend) || 0,
    leads: Number(d.results) || 0,
    impressions: Number(d.impressions) || 0,
    custo: (Number(d.results) || 0) > 0 ? (Number(d.spend) || 0) / Number(d.results) : 0,
    gasto: Number(d.spend) || 0,
  }))
}
