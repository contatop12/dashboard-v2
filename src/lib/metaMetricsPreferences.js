import { META_METRIC_DEFS, META_CONVERSION_OPTIONS } from './metaMetricsConfig'

export const META_METRICS_LS_VISIBILITY = 'p12_meta_metrics_visibility'
export const META_METRICS_LS_CONVERSION = 'p12_meta_metrics_conversion'

const DEFAULT_VISIBILITY = Object.fromEntries(
  Object.entries(META_METRIC_DEFS).map(([k, v]) => [k, v.defaultOn !== false])
)

export function readMetaMetricsVisibility() {
  try {
    const raw = localStorage.getItem(META_METRICS_LS_VISIBILITY)
    if (!raw) return { ...DEFAULT_VISIBILITY }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_VISIBILITY }
    return { ...DEFAULT_VISIBILITY, ...parsed }
  } catch {
    return { ...DEFAULT_VISIBILITY }
  }
}

export function writeMetaMetricsVisibility(map) {
  try {
    localStorage.setItem(META_METRICS_LS_VISIBILITY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function resetMetaMetricsVisibility() {
  writeMetaMetricsVisibility(DEFAULT_VISIBILITY)
  return { ...DEFAULT_VISIBILITY }
}

export function readMetaConversionType() {
  try {
    const v = localStorage.getItem(META_METRICS_LS_CONVERSION)?.trim()
    if (v && META_CONVERSION_OPTIONS.some((o) => o.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'leads'
}

export function writeMetaConversionType(id) {
  try {
    localStorage.setItem(META_METRICS_LS_CONVERSION, id)
  } catch {
    /* ignore */
  }
}
