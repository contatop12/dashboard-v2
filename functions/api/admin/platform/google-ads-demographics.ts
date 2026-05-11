/** Agregação GAQL de públicos demográficos (idade, sexo, renda, parentalidade) para o overview Google Ads. */

type GaqlRow = Record<string, unknown>

function rowObj(row: GaqlRow): Record<string, unknown> {
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
}

function parseAdGroupCriterion(row: GaqlRow): Record<string, unknown> | null {
  const R = rowObj(row)
  const crit = R.adGroupCriterion ?? R.ad_group_criterion
  if (!crit || typeof crit !== 'object') return null
  return crit as Record<string, unknown>
}

function readNestedEnumType(crit: Record<string, unknown>, nestedNames: string[]): string | null {
  for (const n of nestedNames) {
    const seg = crit[n]
    if (seg && typeof seg === 'object') {
      const o = seg as Record<string, unknown>
      const t = o.type ?? o.Type
      if (typeof t === 'string' && t.trim()) return t.trim()
    }
  }
  return null
}

function parseMetricsBasic(m: unknown): {
  impressions: number
  clicks: number
  costMicros: number
  conversions: number
} {
  if (!m || typeof m !== 'object') {
    return { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 }
  }
  const o = m as Record<string, unknown>
  return {
    impressions: Number.parseInt(String(o.impressions ?? '0'), 10) || 0,
    clicks: Number.parseInt(String(o.clicks ?? '0'), 10) || 0,
    costMicros: Number.parseInt(String(o.costMicros ?? o.cost_micros ?? '0'), 10) || 0,
    conversions: Number.parseFloat(String(o.conversions ?? '0')) || 0,
  }
}

export type DemographicRow = {
  segmentKey: string
  segmentLabel: string
  impressions: number
  interactions: number
  interactionRate: number | null
  averageCpc: number | null
  cost: number
  convRate: number | null
  conversions: number
  costPerConversion: number | null
}

export type DemographicsTabPayload = {
  items: DemographicRow[]
  error: string | null
}

export type GoogleDemographicsPayload = {
  age: DemographicsTabPayload
  gender: DemographicsTabPayload
  income: DemographicsTabPayload
  parental: DemographicsTabPayload
}

export const EMPTY_GOOGLE_DEMOGRAPHICS: GoogleDemographicsPayload = {
  age: { items: [], error: null },
  gender: { items: [], error: null },
  income: { items: [], error: null },
  parental: { items: [], error: null },
}

const AGE_LABELS: Record<string, string> = {
  AGE_RANGE_18_24: '18 a 24',
  AGE_RANGE_25_34: '25 a 34',
  AGE_RANGE_35_44: '35 a 44',
  AGE_RANGE_45_54: '45 a 54',
  AGE_RANGE_55_64: '55 a 64',
  AGE_RANGE_65_UP: '+65',
  AGE_RANGE_UNDETERMINED: 'Desconhecida',
  AGE_RANGE_UNDETERMINED_SEARCH: 'Desconhecida',
}

const AGE_SORT: string[] = [
  'AGE_RANGE_18_24',
  'AGE_RANGE_25_34',
  'AGE_RANGE_35_44',
  'AGE_RANGE_45_54',
  'AGE_RANGE_55_64',
  'AGE_RANGE_65_UP',
  'AGE_RANGE_UNDETERMINED',
  'AGE_RANGE_UNDETERMINED_SEARCH',
]

const GENDER_LABELS: Record<string, string> = {
  GENDER_MALE: 'Masculino',
  GENDER_FEMALE: 'Feminino',
  GENDER_UNDETERMINED: 'Desconhecido',
  MALE: 'Masculino',
  FEMALE: 'Feminino',
  UNDETERMINED: 'Desconhecido',
}

const GENDER_SORT = ['GENDER_FEMALE', 'FEMALE', 'GENDER_MALE', 'MALE', 'GENDER_UNDETERMINED', 'UNDETERMINED']

const INCOME_LABELS: Record<string, string> = {
  INCOME_RANGE_UNDETERMINED: 'Desconhecida',
  INCOME_RANGE_0_50: '0–50%',
  INCOME_RANGE_50_60: '50–60%',
  INCOME_RANGE_60_70: '60–70%',
  INCOME_RANGE_70_80: '70–80%',
  INCOME_RANGE_80_90: '80–90%',
  INCOME_RANGE_90_UP: '90%+',
  INCOME_RANGE_TOP_10_PERCENT: '10% maior renda',
  INCOME_RANGE_TOP_10: '10% maior renda',
}

const INCOME_SORT = [
  'INCOME_RANGE_0_50',
  'INCOME_RANGE_50_60',
  'INCOME_RANGE_60_70',
  'INCOME_RANGE_70_80',
  'INCOME_RANGE_80_90',
  'INCOME_RANGE_90_UP',
  'INCOME_RANGE_TOP_10_PERCENT',
  'INCOME_RANGE_TOP_10',
  'INCOME_RANGE_UNDETERMINED',
]

const PARENTAL_LABELS: Record<string, string> = {
  PARENTAL_STATUS_PARENT: 'Pais',
  PARENTAL_STATUS_NOT_A_PARENT: 'Não pais',
  PARENTAL_STATUS_UNDETERMINED: 'Desconhecido',
  NOT_A_PARENT: 'Não pais',
  PARENT: 'Pais',
  UNDETERMINED: 'Desconhecido',
}

const PARENTAL_SORT = ['PARENTAL_STATUS_PARENT', 'PARENT', 'PARENTAL_STATUS_NOT_A_PARENT', 'NOT_A_PARENT', 'PARENTAL_STATUS_UNDETERMINED', 'UNDETERMINED']

function labelFor(key: string, map: Record<string, string>): string {
  if (map[key]) return map[key]
  return key.replace(/^GENDER_|^AGE_RANGE_|^INCOME_RANGE_|^PARENTAL_STATUS_/g, '').replace(/_/g, ' ')
}

function sortRowsByKeys(rows: DemographicRow[], order: string[]): DemographicRow[] {
  const idx = (k: string) => {
    const i = order.indexOf(k)
    return i === -1 ? 999 : i
  }
  return [...rows].sort((a, b) => {
    const d = idx(a.segmentKey) - idx(b.segmentKey)
    if (d !== 0) return d
    return a.segmentLabel.localeCompare(b.segmentLabel, 'pt')
  })
}

type FetchRowsFn = (
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  query: string
) => Promise<{ rows: GaqlRow[]; error?: string }>

const DEMOGRAPHIC_CRITERION_SELECT: Record<string, string> = {
  age_range_view: 'ad_group_criterion.age_range.type',
  gender_view: 'ad_group_criterion.gender.type',
  income_range_view: 'ad_group_criterion.income_range.type',
  parental_status_view: 'ad_group_criterion.parental_status.type',
}

async function aggregateDemographicView(
  fetchRows: FetchRowsFn,
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  fromResource: string,
  nestedNames: string[],
  labelMap: Record<string, string>,
  sortOrder: string[]
): Promise<DemographicsTabPayload> {
  const critSelect = DEMOGRAPHIC_CRITERION_SELECT[fromResource]
  if (!critSelect) {
    return { items: [], error: `Recurso demográfico desconhecido: ${fromResource}` }
  }
  const query = `
    SELECT
      ${critSelect},
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM ${fromResource}
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status != 'REMOVED'
      AND ad_group_criterion.status != 'REMOVED'
  `
  const res = await fetchRows(ver, numericId, headers, query)
  if (res.error) {
    return { items: [], error: res.error }
  }

  const agg = new Map<string, { impressions: number; clicks: number; costMicros: number; conversions: number }>()
  for (const row of res.rows) {
    const crit = parseAdGroupCriterion(row)
    if (!crit) continue
    const segKey = readNestedEnumType(crit, nestedNames)
    if (!segKey) continue
    const m = parseMetricsBasic(rowObj(row).metrics)
    const cur = agg.get(segKey) ?? { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 }
    cur.impressions += m.impressions
    cur.clicks += m.clicks
    cur.costMicros += m.costMicros
    cur.conversions += m.conversions
    agg.set(segKey, cur)
  }

  const items: DemographicRow[] = []
  for (const [segmentKey, a] of agg.entries()) {
    if (a.impressions === 0 && a.clicks === 0 && a.costMicros === 0 && a.conversions === 0) continue
    const cost = a.costMicros / 1_000_000
    const interactions = a.clicks
    const impressions = a.impressions
    const conversions = a.conversions
    const interactionRate = impressions > 0 ? (interactions / impressions) * 100 : null
    const averageCpc = interactions > 0 ? cost / interactions : null
    const convRate = interactions > 0 ? (conversions / interactions) * 100 : null
    const costPerConversion = conversions > 0 ? cost / conversions : null
    items.push({
      segmentKey,
      segmentLabel: labelFor(segmentKey, labelMap),
      impressions,
      interactions,
      interactionRate,
      averageCpc,
      cost,
      convRate,
      conversions,
      costPerConversion,
    })
  }

  return { items: sortRowsByKeys(items, sortOrder), error: null }
}

export async function fetchGoogleDemographicsPayload(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string,
  fetchRows: FetchRowsFn
): Promise<GoogleDemographicsPayload> {
  const [age, gender, income, parental] = await Promise.all([
    aggregateDemographicView(
      fetchRows,
      ver,
      numericId,
      headers,
      since,
      until,
      'age_range_view',
      ['ageRange', 'age_range'],
      AGE_LABELS,
      AGE_SORT
    ),
    aggregateDemographicView(
      fetchRows,
      ver,
      numericId,
      headers,
      since,
      until,
      'gender_view',
      ['gender'],
      GENDER_LABELS,
      GENDER_SORT
    ),
    aggregateDemographicView(
      fetchRows,
      ver,
      numericId,
      headers,
      since,
      until,
      'income_range_view',
      ['incomeRange', 'income_range'],
      INCOME_LABELS,
      INCOME_SORT
    ),
    aggregateDemographicView(
      fetchRows,
      ver,
      numericId,
      headers,
      since,
      until,
      'parental_status_view',
      ['parentalStatus', 'parental_status'],
      PARENTAL_LABELS,
      PARENTAL_SORT
    ),
  ])
  return { age, gender, income, parental }
}
