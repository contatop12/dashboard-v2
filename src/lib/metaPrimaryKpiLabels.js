/** Labels dos KPIs primários Meta (índice = meta-kpi-{índice}). Fonte única para grid e modal "Ordem dos KPIs". */
export const META_PRIMARY_KPI_LABELS = [
  'Valor gasto',
  'Alcance',
  'Impressões',
  'CPM',
  'CTR (link)',
  'CPC (link)',
  'Frequência',
  'Leads',
]

export function labelForMetaPrimaryKpiId(defId) {
  const m = /^meta-kpi-(\d+)$/.exec(defId)
  if (!m) return null
  const i = Number(m[1])
  return META_PRIMARY_KPI_LABELS[i] ?? null
}
