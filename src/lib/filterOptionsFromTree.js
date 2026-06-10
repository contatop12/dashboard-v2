/**
 * Deriva opções de filtro de uma árvore campanha→filhos(adsets)→ads.
 * Chaves neutras de plataforma: `campanha`, `children` (conjuntos/grupos), `ads`, `objetivo`.
 */
export function filterOptionsFromTree(tree) {
  const rows = Array.isArray(tree) ? tree : []
  const campanha = []
  const children = []
  const ads = []
  const byObjective = new Map()

  for (const c of rows) {
    campanha.push({ id: String(c.id), name: c.name })
    const obj = String(c.objective ?? '').trim()
    if (obj && obj !== '—') {
      const cur = byObjective.get(obj) ?? []
      cur.push(String(c.id))
      byObjective.set(obj, cur)
    }
    for (const s of c.adsets ?? []) {
      children.push({ id: String(s.id), name: s.name, campaignId: String(c.id) })
      for (const a of s.ads ?? []) {
        ads.push({ id: String(a.id), name: a.name, adsetId: String(s.id), campaignId: String(c.id) })
      }
    }
  }

  const objetivo = [...byObjective.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({ id: key, name: key, campaignIds: ids }))

  return { campanha, children, ads, objetivo }
}

/** Recorte client-side da árvore conforme filtros selecionados ({campanha,children,ads,objetivo}). */
export function resolveTreeSlice(tree, selected) {
  let rows = Array.isArray(tree) ? tree : []
  const campId = selected?.campanha?.id
  const childId = selected?.children?.id
  const adId = selected?.ads?.id
  const objectiveCampaignIds = selected?.objetivo?.campaignIds

  if (Array.isArray(objectiveCampaignIds) && objectiveCampaignIds.length) {
    const set = new Set(objectiveCampaignIds.map(String))
    rows = rows.filter((c) => set.has(String(c.id)))
  }
  if (campId) rows = rows.filter((c) => String(c.id) === String(campId))
  if (childId) {
    rows = rows
      .map((c) => ({ ...c, adsets: (c.adsets ?? []).filter((s) => String(s.id) === String(childId)) }))
      .filter((c) => c.adsets.length > 0)
  }
  if (adId) {
    rows = rows
      .map((c) => ({
        ...c,
        adsets: (c.adsets ?? [])
          .map((s) => ({ ...s, ads: (s.ads ?? []).filter((a) => String(a.id) === String(adId)) }))
          .filter((s) => s.ads.length > 0),
      }))
      .filter((c) => c.adsets.length > 0)
  }
  return rows
}
