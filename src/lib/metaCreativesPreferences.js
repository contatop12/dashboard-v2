/** Preferências locais do bloco Criativos — Meta Ads */

export const META_CREATIVES_LS_SORT = 'p12_meta_creatives_sort'
export const META_CREATIVES_LS_METRICS = 'p12_meta_creatives_metric_keys'

export const META_CREATIVE_SORT_OPTIONS = [
  { id: 'spend_desc', label: 'Investimento (maior → menor)' },
  { id: 'leads_desc', label: 'Leads (maior → menor)' },
  { id: 'cpl_asc', label: 'Custo por lead (menor → maior)' },
  { id: 'impressions_desc', label: 'Impressões (maior → menor)' },
  { id: 'ctr_desc', label: 'CTR (maior → menor)' },
  { id: 'clicks_desc', label: 'Cliques no link (maior → menor)' },
  { id: 'name_asc', label: 'Nome (A → Z)' },
]

export const META_CREATIVE_METRIC_OPTIONS = [
  { key: 'leads', label: 'Leads (form.)' },
  { key: 'cpl', label: 'Custo/lead' },
  { key: 'spend', label: 'Investimento' },
  { key: 'impressions', label: 'Impressões' },
  { key: 'clicks', label: 'Cliques (link)' },
  { key: 'ctr', label: 'CTR (link)' },
]

const DEFAULT_SORT = 'spend_desc'
const DEFAULT_METRICS = ['leads', 'cpl', 'spend']

export function readMetaCreativesSort() {
  try {
    const v = localStorage.getItem(META_CREATIVES_LS_SORT)?.trim()
    if (v && META_CREATIVE_SORT_OPTIONS.some((o) => o.id === v)) return v
  } catch {
    /* ignore */
  }
  return DEFAULT_SORT
}

export function writeMetaCreativesSort(id) {
  try {
    localStorage.setItem(META_CREATIVES_LS_SORT, id)
  } catch {
    /* ignore */
  }
}

export function readMetaCreativesMetricKeys() {
  try {
    const raw = localStorage.getItem(META_CREATIVES_LS_METRICS)
    if (!raw) return [...DEFAULT_METRICS]
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || arr.length === 0) return [...DEFAULT_METRICS]
    const allowed = new Set(META_CREATIVE_METRIC_OPTIONS.map((o) => o.key))
    const cleaned = arr.map((k) => (allowed.has(k) ? k : 'spend'))
    const seen = new Set()
    const out = []
    for (const k of cleaned) {
      if (out.length >= 3) break
      if (!seen.has(k)) {
        seen.add(k)
        out.push(k)
      }
    }
    for (const k of META_CREATIVE_METRIC_OPTIONS.map((o) => o.key)) {
      if (out.length >= 3) break
      if (!seen.has(k)) {
        seen.add(k)
        out.push(k)
      }
    }
    return out.slice(0, 3)
  } catch {
    return [...DEFAULT_METRICS]
  }
}

export function writeMetaCreativesMetricKeys(keys) {
  try {
    localStorage.setItem(META_CREATIVES_LS_METRICS, JSON.stringify(keys.slice(0, 3)))
  } catch {
    /* ignore */
  }
}
