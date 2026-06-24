/** Ordenação de nós da árvore de campanhas (campanha, grupo, anúncio). */
import { hasActiveNameContainsFilters } from '@/lib/filterOptionsFromTree'

export const CAMPAIGN_SORT_OPTIONS = [
  { id: 'spend', label: 'Investimento' },
  { id: 'impressions', label: 'Impressões' },
  { id: 'clicks', label: 'Cliques' },
  { id: 'results', label: 'Conversões' },
  { id: 'ctrLink', label: 'CTR link' },
  { id: 'cpm', label: 'CPM' },
  { id: 'name', label: 'Nome' },
]

export const DEFAULT_CAMPAIGN_SORT = { id: 'spend', desc: true }

function metricValue(node, sortId) {
  const m = node?.metrics || {}
  switch (sortId) {
    case 'name':
      return String(node?.name ?? '').toLowerCase()
    case 'impressions':
      return Number(m.impressions) || 0
    case 'clicks':
      return Number(m.clicks) || 0
    case 'results':
      return Number(m.results) || 0
    case 'ctrLink':
      return Number(m.ctrLink) || 0
    case 'cpm':
      return Number(m.cpm) || 0
    case 'spend':
    default:
      return Number(m.spend) || 0
  }
}

function compareSortValues(a, b, sortId) {
  if (sortId === 'name') {
    return String(a).localeCompare(String(b), 'pt-BR')
  }
  if (a === b) return 0
  return a > b ? 1 : -1
}

/** Ordena lista de campanhas/grupos/anúncios. */
export function sortCampaignNodes(items, sortId = 'spend', desc = true) {
  const list = [...(items || [])]
  const id = sortId || 'spend'
  list.sort((a, b) => {
    const cmp = compareSortValues(metricValue(a, id), metricValue(b, id), id)
    return desc ? -cmp : cmp
  })
  return list
}

export const CAMPAIGN_VIEW_FILTER_CHIPS = [
  { key: 'onlyWithSpend', label: 'Com gasto' },
  { key: 'onlyWithConversions', label: 'Com conversões' },
  { key: 'onlyWithImpressions', label: 'Com impressões' },
  { key: 'onlyWithClicks', label: 'Com cliques' },
]

export const TOP_SPEND_FILTER_OPTIONS = [
  { id: '', label: 'Todos investimentos' },
  { id: '5', label: 'Top 5 investimento' },
  { id: '10', label: 'Top 10 investimento' },
  { id: '20', label: 'Top 20 investimento' },
]

/** Mantém apenas as N campanhas com maior investimento no período. */
export function applyTopSpendFilter(rows, topN) {
  const n = Number(topN)
  if (!Number.isFinite(n) || n <= 0) return Array.isArray(rows) ? rows : []
  const list = [...(rows || [])]
  list.sort((a, b) => (Number(b.metrics?.spend) || 0) - (Number(a.metrics?.spend) || 0))
  return list.slice(0, n)
}

/** Filtros rápidos de visualização (com gasto, conversões, etc.). */
export function applyCampaignViewFilters(rows, view = {}) {
  let list = Array.isArray(rows) ? rows : []
  if (view.onlyWithSpend) {
    list = list.filter((c) => (Number(c.metrics?.spend) || 0) > 0)
  }
  if (view.onlyWithConversions) {
    list = list.filter((c) => (Number(c.metrics?.results) || 0) > 0)
  }
  if (view.onlyWithImpressions) {
    list = list.filter((c) => (Number(c.metrics?.impressions) || 0) > 0)
  }
  if (view.onlyWithClicks) {
    list = list.filter((c) => (Number(c.metrics?.clicks) || 0) > 0)
  }
  return list
}

export function resolveCampaignSort(blockFilters = {}) {
  const id = CAMPAIGN_SORT_OPTIONS.some((o) => o.id === blockFilters.sortBy)
    ? blockFilters.sortBy
    : DEFAULT_CAMPAIGN_SORT.id
  const desc = blockFilters.sortDesc !== false
  return { id, desc }
}

export function resolveCampaignViewFilters(blockFilters = {}) {
  return {
    onlyWithSpend: blockFilters.onlyWithSpend === true,
    onlyWithConversions: blockFilters.onlyWithConversions === true,
    onlyWithImpressions: blockFilters.onlyWithImpressions === true,
    onlyWithClicks: blockFilters.onlyWithClicks === true,
  }
}

/** Indica se há filtros locais ativos no bloco de campanhas (Meta ou Google). */
export function hasActiveCampaignBlockFilters(blockFilters = {}) {
  const view = resolveCampaignViewFilters(blockFilters)
  return Boolean(
    blockFilters.objetivo ||
      blockFilters.status ||
      blockFilters.campanha ||
      blockFilters.children ||
      hasActiveNameContainsFilters(blockFilters) ||
      blockFilters.topSpendCount ||
      Object.values(view).some(Boolean)
  )
}

export function hasActiveCampaignToolbarExtras(blockFilters = {}) {
  const { id, desc } = resolveCampaignSort(blockFilters)
  const view = resolveCampaignViewFilters(blockFilters)
  const hasView = Object.values(view).some(Boolean)
  const hasSort = id !== DEFAULT_CAMPAIGN_SORT.id || desc !== DEFAULT_CAMPAIGN_SORT.desc
  const dimensionKeys = ['campanha', 'children', 'objetivo', 'status']
  const hasDimension = dimensionKeys.some((k) => blockFilters[k])
  const hasNameContains = Array.isArray(blockFilters.nameContainsFilters)
    ? blockFilters.nameContainsFilters.some((f) => String(f?.text ?? '').trim())
    : Boolean(String(blockFilters.nameContains?.text ?? '').trim())
  const hasTopSpend = Boolean(blockFilters.topSpendCount)
  return hasView || hasSort || hasDimension || hasNameContains || hasTopSpend
}
