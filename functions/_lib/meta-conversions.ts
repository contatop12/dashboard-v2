/** Tipos de ação que representam leads reais na Meta (não LPV, ThruPlay, etc.). */
const LEAD_FALLBACK_TYPES = [
  'onsite_conversion.lead_grouped',
  'leadgen_grouped',
  'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.lead',
  'offsite_conversion.lead',
] as const

function actionMap(actions: unknown): Map<string, number> {
  const map = new Map<string, number>()
  if (!Array.isArray(actions)) return map
  for (const a of actions) {
    const o = a as { action_type?: string; value?: string }
    const t = String(o.action_type ?? '').trim()
    if (!t) continue
    const v = Number.parseFloat(String(o.value ?? '0')) || 0
    map.set(t, (map.get(t) ?? 0) + v)
  }
  return map
}

/**
 * Conta leads sem inflar com outras conversões onsite.
 * Prioriza `lead` (total agregado da Meta) e evita somar tipos duplicados.
 */
export function parseLeadsFromRow(row: Record<string, unknown>): number {
  const map = actionMap(row.actions)
  if (map.has('lead')) return Math.round(map.get('lead')!)

  const grouped = map.get('onsite_conversion.lead_grouped')
  if (grouped != null && grouped > 0) return Math.round(grouped)

  let total = 0
  for (const key of LEAD_FALLBACK_TYPES) {
    if (key === 'onsite_conversion.lead_grouped') continue
    total += map.get(key) ?? 0
  }
  return Math.round(total)
}

/** Resultados primários reportados pela Meta (modo automático). */
export function parseObjectiveResults(row: Record<string, unknown>): number {
  for (const key of ['objective_results', 'results', 'conversions'] as const) {
    const field = row[key]
    if (!Array.isArray(field)) continue
    let n = 0
    for (const item of field) {
      const o = item as Record<string, unknown>
      if (o.value != null) {
        n += Number.parseFloat(String(o.value)) || 0
        continue
      }
      const values = o.values
      if (Array.isArray(values)) {
        for (const v of values) {
          n += Number.parseFloat(String((v as { value?: string }).value ?? 0)) || 0
        }
      }
    }
    if (n > 0) return Math.round(n)
  }
  return 0
}

/** Soma valores em actions e também em conversions/results/objective_results. */
export function sumInsightActions(
  row: Record<string, unknown>,
  match: (actionType: string) => boolean
): number {
  let total = sumActionValues(row.actions, match)
  if (total > 0) return total

  for (const key of ['conversions', 'results', 'objective_results'] as const) {
    const field = row[key]
    if (!Array.isArray(field)) continue
    let n = 0
    for (const item of field) {
      const o = item as { action_type?: string; value?: string; values?: { value?: string }[] }
      const t = String(o.action_type ?? '')
      if (!match(t)) continue
      if (o.value != null) {
        n += Number.parseFloat(String(o.value)) || 0
        continue
      }
      if (Array.isArray(o.values)) {
        for (const v of o.values) {
          n += Number.parseFloat(String(v.value ?? 0)) || 0
        }
      }
    }
    if (n > 0) return Math.round(n)
  }
  return 0
}

/** Campo de vídeo da Meta (array action_type/value ou número). */
export function sumVideoMetricField(row: Record<string, unknown>, key: string): number {
  const v = row[key]
  if (Array.isArray(v)) return sumActionValues(v, () => true)
  return Math.round(Number.parseFloat(String(v ?? '0')) || 0)
}

function sumCostMetricField(row: Record<string, unknown>, key: string): number {
  const v = row[key]
  if (Array.isArray(v)) {
    let n = 0
    for (const a of v) {
      const o = a as { value?: string }
      n += Number.parseFloat(String(o.value ?? '0')) || 0
    }
    return n
  }
  return Number.parseFloat(String(v ?? '0')) || 0
}

/** ThruPlay — alinhado ao Gerenciador de Anúncios. */
export function parseThruPlayFromRow(row: Record<string, unknown>, spend = 0): number {
  const fromVideo = sumVideoMetricField(row, 'video_thruplay_watched_actions')
  if (fromVideo > 0) return fromVideo

  const fromInsights = sumInsightActions(
    row,
    (t) => t.includes('thruplay') || t === 'video_view_thruplay_watched'
  )
  if (fromInsights > 0) return fromInsights

  if (spend > 0) {
    const costPer = sumCostMetricField(row, 'cost_per_thruplay')
    if (costPer > 0) return Math.round(spend / costPer)
  }
  return 0
}

/** Visualizações de vídeo (3 segundos). */
export function parseVideo3SecFromRow(row: Record<string, unknown>): number {
  const fromVideo = sumVideoMetricField(row, 'video_3_sec_watched_actions')
  if (fromVideo > 0) return fromVideo
  return sumInsightActions(row, (t) => t === 'video_view' || t.includes('video_view'))
}

export function sumActionValues(actions: unknown, match: (t: string) => boolean): number {
  if (!Array.isArray(actions)) return 0
  let n = 0
  for (const a of actions) {
    const o = a as { action_type?: string; value?: string }
    const t = String(o.action_type ?? '')
    if (match(t)) n += Number.parseFloat(String(o.value ?? '0')) || 0
  }
  return Math.round(n)
}
