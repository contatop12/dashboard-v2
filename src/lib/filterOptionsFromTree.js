/**
 * Deriva opções de filtro de uma árvore campanha→filhos(adsets)→ads.
 * Chaves neutras: `campanha`, `children`, `ads`, `objetivo`, `keywords`.
 */
import { isErrorEffectiveStatus } from '@/lib/campaignStatus'

function campaignHasIssues(c) {
  if (isErrorEffectiveStatus(c.effectiveStatus)) return true
  for (const s of c.adsets ?? []) {
    if (isErrorEffectiveStatus(s.effectiveStatus)) return true
    for (const a of s.ads ?? []) {
      if (isErrorEffectiveStatus(a.effectiveStatus)) return true
    }
  }
  return false
}

/**
 * @param {object} [opts]
 * @param {Record<string, string>} [opts.objectiveLabels] mapa de rótulos para objetivo/tipo (ex. SEARCH → Search)
 * @param {boolean} [opts.includeKeywords] incluir palavras-chave dos grupos (Google Search)
 */
export function filterOptionsFromTree(tree, opts = {}) {
  const rows = Array.isArray(tree) ? tree : []
  const objectiveLabels = opts.objectiveLabels ?? null
  const includeKeywords = opts.includeKeywords === true
  const campanha = []
  const children = []
  const ads = []
  const keywords = []
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
      if (includeKeywords) {
        for (const kw of s.keywords ?? []) {
          keywords.push({
            id: String(kw.id),
            name: kw.keyword,
            adsetId: String(s.id),
            campaignId: String(c.id),
          })
        }
      }
    }
  }

  const objetivo = [...byObjective.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ids]) => ({
      id: key,
      name: objectiveLabels?.[key] ?? key,
      campaignIds: ids,
    }))

  keywords.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return { campanha, children, ads, objetivo, keywords }
}

export const NAME_CONTAINS_LEVELS = [
  { id: 'campanha', label: 'Campanha' },
  { id: 'children', label: 'children' },
  { id: 'ads', label: 'Anúncio' },
]

function nodeNameContains(node, needle) {
  return String(node?.name ?? '').toLowerCase().includes(needle)
}

/** Filtra árvore por substring no nome, no nível escolhido (campanha, children ou ads). */
export function applyNameContainsToTree(tree, nameContains) {
  const text = String(nameContains?.text ?? '').trim()
  if (!text) return Array.isArray(tree) ? tree : []

  const needle = text.toLowerCase()
  const level = nameContains?.level || 'campanha'
  const rows = Array.isArray(tree) ? tree : []

  if (level === 'campanha') {
    return rows.filter((c) => nodeNameContains(c, needle))
  }

  if (level === 'children') {
    return rows
      .map((c) => ({
        ...c,
        adsets: (c.adsets ?? []).filter((s) => nodeNameContains(s, needle)),
      }))
      .filter((c) => c.adsets.length > 0)
  }

  if (level === 'ads') {
    return rows
      .map((c) => ({
        ...c,
        adsets: (c.adsets ?? [])
          .map((s) => ({
            ...s,
            ads: (s.ads ?? []).filter((a) => nodeNameContains(a, needle)),
          }))
          .filter((s) => s.ads.length > 0),
      }))
      .filter((c) => c.adsets.length > 0)
  }

  return rows
}

/** Recorte client-side da árvore conforme filtros selecionados. */
export function resolveTreeSlice(tree, selected) {
  let rows = Array.isArray(tree) ? tree : []
  const campId = selected?.campanha?.id
  const childId = selected?.children?.id
  const adId = selected?.ads?.id
  const keywordId = selected?.keywords?.id
  const statusId = selected?.status?.id
  const objectiveCampaignIds = selected?.objetivo?.campaignIds

  if (Array.isArray(objectiveCampaignIds) && objectiveCampaignIds.length) {
    const set = new Set(objectiveCampaignIds.map(String))
    rows = rows.filter((c) => set.has(String(c.id)))
  }
  if (statusId) {
    const want = String(statusId).toUpperCase()
    if (want === 'ERROR') {
      rows = rows.filter(campaignHasIssues)
    } else {
      rows = rows.filter((c) => String(c.effectiveStatus ?? '').toUpperCase() === want)
    }
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
  if (keywordId) {
    rows = rows
      .map((c) => ({
        ...c,
        adsets: (c.adsets ?? [])
          .map((s) => ({
            ...s,
            keywords: (s.keywords ?? []).filter((k) => String(k.id) === String(keywordId)),
          }))
          .filter((s) => (s.keywords ?? []).length > 0),
      }))
      .filter((c) => c.adsets.length > 0)
  }
  return applyNameContainsToTree(rows, selected?.nameContains)
}
