# Dashboard Redesign SP2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Ads em paridade com Meta Ads (árvore de campanhas com status + switch funcional), filtros de dimensão server-side genéricos em todas as plataformas, e shell global (Sidebar/Header/FilterBar) padronizado.

**Architecture:** Filtros viram parâmetros do overview URL (`campaign_ids`, `ad_group_id`, `adset_id`, `ad_id`) traduzidos para GAQL `WHERE` (Google) e `filtering` (Meta insights). Opções de filtro derivam da árvore retornada pelo overview e são publicadas no `DashboardFiltersContext` pela página; o FilterBar só consome. A árvore volta sempre completa; o recorte é aplicado nos agregados server-side e na árvore client-side. `CampaignTree`/`useCampaignStatusMutation` parametrizados por plataforma.

**Tech Stack:** React 18 + Vite, Tailwind (tokens CSS-var em `src/index.css`), vitest + @testing-library/react, Cloudflare Pages Functions (TypeScript), Google Ads API (GAQL/REST), Meta Graph API v21.

**Spec:** `docs/superpowers/specs/2026-06-10-dashboard-redesign-sp2-design.md`

**Convenções:**
- Rodar testes: `npx vitest run <arquivo>` (suite toda: `npx vitest run`).
- Commits frequentes, mensagens conventional commits.
- Trabalho direto na branch atual (`main` já contém SP1 não-commitado — não tocar em arquivos modificados não relacionados).

---

### Task 1: Filtros no `buildPlatformOverviewUrl`

**Files:**
- Modify: `src/lib/platformOverviewUrl.js`
- Test: `src/lib/platformOverviewUrl.test.js` (criar)

- [ ] **Step 1: Write the failing test**

```js
// src/lib/platformOverviewUrl.test.js
import { describe, expect, test } from 'vitest'
import { buildPlatformOverviewUrl } from './platformOverviewUrl'

const range = { start: new Date(2026, 4, 1), end: new Date(2026, 4, 30) }
const base = { orgId: 'org1', dateRange: range, compareDateRange: range, compareEnabled: false }

describe('buildPlatformOverviewUrl filters', () => {
  test('sem filters não adiciona params de dimensão', () => {
    const url = buildPlatformOverviewUrl('/api/x', base)
    expect(url).not.toContain('campaign_ids')
    expect(url).not.toContain('ad_group_id')
  })

  test('inclui campaign_ids como CSV', () => {
    const url = buildPlatformOverviewUrl('/api/x', { ...base, filters: { campaignIds: ['123', '456'] } })
    expect(url).toContain('campaign_ids=123%2C456')
  })

  test('inclui adset_id, ad_group_id e ad_id quando presentes', () => {
    const url = buildPlatformOverviewUrl('/api/x', {
      ...base,
      filters: { adsetId: '11', adGroupId: '22', adId: '33' },
    })
    expect(url).toContain('adset_id=11')
    expect(url).toContain('ad_group_id=22')
    expect(url).toContain('ad_id=33')
  })

  test('ignora valores vazios', () => {
    const url = buildPlatformOverviewUrl('/api/x', { ...base, filters: { campaignIds: [], adId: '' } })
    expect(url).not.toContain('campaign_ids')
    expect(url).not.toContain('ad_id')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/platformOverviewUrl.test.js`
Expected: FAIL — `campaign_ids` ausente da URL.

- [ ] **Step 3: Write minimal implementation**

Em `src/lib/platformOverviewUrl.js`, antes de `const qs = p.toString()`:

```js
  const f = opts.filters || {}
  const campaignIds = Array.isArray(f.campaignIds) ? f.campaignIds.filter(Boolean) : []
  if (campaignIds.length) p.set('campaign_ids', campaignIds.join(','))
  if (f.adsetId) p.set('adset_id', String(f.adsetId))
  if (f.adGroupId) p.set('ad_group_id', String(f.adGroupId))
  if (f.adId) p.set('ad_id', String(f.adId))
```

Atualizar o JSDoc de `opts` adicionando `filters?: { campaignIds?: string[], adsetId?: string, adGroupId?: string, adId?: string }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/platformOverviewUrl.test.js`
Expected: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/platformOverviewUrl.js src/lib/platformOverviewUrl.test.js
git commit -m "feat: dimension filter params in platform overview URL"
```

---

### Task 2: Parser + cláusulas GAQL de filtro (backend Google)

**Files:**
- Create: `functions/_lib/google-ads-filters.ts`
- Test: `functions/_lib/google-ads-filters.test.ts`

**Segurança:** IDs entram em string GAQL — sanitizar para dígitos apenas (previne injeção GAQL).

- [ ] **Step 1: Write the failing test**

```ts
// functions/_lib/google-ads-filters.test.ts
import { describe, expect, test } from 'vitest'
import { parseGoogleDimensionFilters, gaqlFilterClause } from './google-ads-filters'

describe('parseGoogleDimensionFilters', () => {
  test('extrai e sanitiza ids da URL', () => {
    const url = new URL('https://x/api?campaign_ids=123,456,abc&ad_group_id=99x')
    expect(parseGoogleDimensionFilters(url)).toEqual({
      campaignIds: ['123', '456'],
      adGroupId: '99',
      adId: null,
    })
  })

  test('vazio quando sem params', () => {
    const url = new URL('https://x/api')
    expect(parseGoogleDimensionFilters(url)).toEqual({ campaignIds: [], adGroupId: null, adId: null })
  })
})

describe('gaqlFilterClause', () => {
  test('campaign IN para múltiplos ids', () => {
    expect(gaqlFilterClause({ campaignIds: ['1', '2'], adGroupId: null, adId: null })).toBe(
      " AND campaign.id IN (1, 2)"
    )
  })

  test('ad_group.id quando presente', () => {
    expect(gaqlFilterClause({ campaignIds: [], adGroupId: '7', adId: null })).toBe(
      ' AND ad_group.id = 7'
    )
  })

  test('combina campaign + ad_group', () => {
    expect(gaqlFilterClause({ campaignIds: ['1'], adGroupId: '7', adId: null })).toBe(
      ' AND campaign.id IN (1) AND ad_group.id = 7'
    )
  })

  test('string vazia sem filtros', () => {
    expect(gaqlFilterClause({ campaignIds: [], adGroupId: null, adId: null })).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/_lib/google-ads-filters.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/_lib/google-ads-filters.ts
export type GoogleDimensionFilters = {
  campaignIds: string[]
  adGroupId: string | null
  adId: string | null
}

function sanitizeId(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s : null
}

export function parseGoogleDimensionFilters(url: URL): GoogleDimensionFilters {
  const rawIds = url.searchParams.get('campaign_ids')?.split(',') ?? []
  const campaignIds = rawIds.map((s) => sanitizeId(s)).filter((s): s is string => s != null)
  // ad_group_id pode vir com sufixo não numérico — extrai prefixo de dígitos
  const agRaw = url.searchParams.get('ad_group_id')
  const agDigits = agRaw ? agRaw.match(/^\d+/)?.[0] ?? null : null
  const adRaw = url.searchParams.get('ad_id')
  const adDigits = adRaw ? adRaw.match(/^\d+/)?.[0] ?? null : null
  return { campaignIds, adGroupId: agDigits, adId: adDigits }
}

/** Cláusulas extras para concatenar em um WHERE GAQL existente. */
export function gaqlFilterClause(f: GoogleDimensionFilters): string {
  let out = ''
  if (f.campaignIds.length > 0) out += ` AND campaign.id IN (${f.campaignIds.join(', ')})`
  if (f.adGroupId) out += ` AND ad_group.id = ${f.adGroupId}`
  return out
}
```

Nota: `adId` é parseado mas não vira cláusula GAQL (nível ad não filtra agregados de campanha; reservado para uso futuro).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/_lib/google-ads-filters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-ads-filters.ts functions/_lib/google-ads-filters.test.ts
git commit -m "feat: GAQL dimension filter parsing + clauses"
```

---

### Task 3: Montagem pura da árvore Google (campaign → adGroup → ad)

**Files:**
- Create: `functions/_lib/google-ads-tree.ts`
- Test: `functions/_lib/google-ads-tree.test.ts`

Reusa `buildMetaTree` de `functions/_lib/meta-tree.ts` (montagem por `parentId` é idêntica). Este módulo só converte linhas GAQL em `MetaNodeInput` e mapeia status Google → vocabulário do front (`ACTIVE`/`PAUSED`/outro literal).

**Forma dos nós:** mesma da Meta (`adsets`/`ads` como chaves de filhos) — o `CampaignTree` é compartilhado; labels mudam via props (Task 7).

**ID do anúncio:** composto `adGroupId~adId` (formato do resourceName `adGroupAds`), necessário pro mutate (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
// functions/_lib/google-ads-tree.test.ts
import { describe, expect, test } from 'vitest'
import {
  mapGoogleStatus,
  parseCampaignNodes,
  parseAdGroupNodes,
  parseAdNodes,
  buildGoogleTree,
} from './google-ads-tree'

describe('mapGoogleStatus', () => {
  test('ENABLED vira ACTIVE', () => expect(mapGoogleStatus('ENABLED')).toBe('ACTIVE'))
  test('PAUSED mantém', () => expect(mapGoogleStatus('PAUSED')).toBe('PAUSED'))
  test('desconhecido passa adiante', () => expect(mapGoogleStatus('REMOVED')).toBe('REMOVED'))
})

const campCatalog = [
  { campaign: { id: '1', name: 'Camp A', status: 'ENABLED', advertisingChannelType: 'SEARCH' } },
]
const campMetrics = [
  {
    campaign: { id: '1' },
    metrics: { costMicros: '2000000', impressions: '100', clicks: '10', conversions: '2' },
  },
]

describe('parseCampaignNodes', () => {
  test('merge catálogo + métricas', () => {
    const nodes = parseCampaignNodes(campCatalog, campMetrics)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: '1',
      name: 'Camp A',
      effectiveStatus: 'ACTIVE',
      objective: 'SEARCH',
      parentId: null,
    })
    expect(nodes[0].metrics.spend).toBe(2)
    expect(nodes[0].metrics.results).toBe(2)
    expect(nodes[0].metrics.ctrLink).toBeCloseTo(10)
  })

  test('campanha sem métricas no período entra zerada', () => {
    const nodes = parseCampaignNodes(campCatalog, [])
    expect(nodes[0].metrics.spend).toBe(0)
  })
})

describe('parseAdGroupNodes / parseAdNodes', () => {
  test('adGroup aponta pra campanha', () => {
    const nodes = parseAdGroupNodes(
      [{ adGroup: { id: '11', name: 'AG', status: 'PAUSED' }, campaign: { id: '1' } }],
      []
    )
    expect(nodes[0]).toMatchObject({ id: '11', parentId: '1', effectiveStatus: 'PAUSED' })
  })

  test('ad usa id composto adGroupId~adId', () => {
    const nodes = parseAdNodes(
      [
        {
          adGroupAd: { status: 'ENABLED', ad: { id: '99', name: 'Ad X' } },
          adGroup: { id: '11' },
        },
      ],
      []
    )
    expect(nodes[0]).toMatchObject({ id: '11~99', name: 'Ad X', parentId: '11' })
  })
})

describe('buildGoogleTree', () => {
  test('monta hierarquia completa', () => {
    const tree = buildGoogleTree(
      parseCampaignNodes(campCatalog, campMetrics),
      parseAdGroupNodes([{ adGroup: { id: '11', name: 'AG', status: 'ENABLED' }, campaign: { id: '1' } }], []),
      parseAdNodes(
        [{ adGroupAd: { status: 'ENABLED', ad: { id: '99', name: 'Ad X' } }, adGroup: { id: '11' } }],
        []
      )
    )
    expect(tree).toHaveLength(1)
    expect(tree[0].adsets).toHaveLength(1)
    expect(tree[0].adsets[0].ads).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/_lib/google-ads-tree.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/_lib/google-ads-tree.ts
import { buildMetaTree, type MetaCampaignNode, type MetaNodeInput } from './meta-tree'

type GaqlRow = Record<string, unknown>

export function mapGoogleStatus(raw: unknown): string {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'ENABLED') return 'ACTIVE'
  return s || 'UNKNOWN'
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : ''
}

type NodeMetrics = { spend: number; results: number; ctrLink: number; cpm: number }

function readRowMetrics(m: unknown): NodeMetrics & { impressions: number; clicks: number } {
  const o = obj(m)
  const costMicros = Number.parseInt(String(o.costMicros ?? o.cost_micros ?? '0'), 10) || 0
  const impressions = Number.parseInt(String(o.impressions ?? '0'), 10) || 0
  const clicks = Number.parseInt(String(o.clicks ?? '0'), 10) || 0
  const conversions = Number.parseFloat(String(o.conversions ?? '0')) || 0
  const spend = costMicros / 1_000_000
  return {
    spend,
    results: conversions,
    ctrLink: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    impressions,
    clicks,
  }
}

function zeroMetrics(): NodeMetrics {
  return { spend: 0, results: 0, ctrLink: 0, cpm: 0 }
}

/** Agrega métricas por id (linhas GAQL com segments podem repetir entidade). */
function metricsById(rows: GaqlRow[], idOf: (row: GaqlRow) => string): Map<string, NodeMetrics> {
  type Acc = { costSpend: number; impressions: number; clicks: number; conversions: number }
  const acc = new Map<string, Acc>()
  for (const row of rows) {
    const id = idOf(row)
    if (!id) continue
    const m = readRowMetrics(obj(row).metrics)
    const cur = acc.get(id) ?? { costSpend: 0, impressions: 0, clicks: 0, conversions: 0 }
    cur.costSpend += m.spend
    cur.impressions += m.impressions
    cur.clicks += m.clicks
    cur.conversions += m.results
    acc.set(id, cur)
  }
  const out = new Map<string, NodeMetrics>()
  for (const [id, a] of acc) {
    out.set(id, {
      spend: a.costSpend,
      results: a.conversions,
      ctrLink: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      cpm: a.impressions > 0 ? (a.costSpend / a.impressions) * 1000 : 0,
    })
  }
  return out
}

export function parseCampaignNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const metrics = metricsById(metricRows, (r) => str(obj(obj(r).campaign).id))
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const c = obj(obj(row).campaign)
    const id = str(c.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(c.name) || `Campanha ${id}`,
      effectiveStatus: mapGoogleStatus(c.status),
      objective: str(c.advertisingChannelType ?? c.advertising_channel_type) || '—',
      dailyBudget: 0,
      parentId: null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function parseAdGroupNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const metrics = metricsById(metricRows, (r) => str(obj(obj(r).adGroup ?? obj(r).ad_group).id))
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const R = obj(row)
    const g = obj(R.adGroup ?? R.ad_group)
    const id = str(g.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(g.name) || `Grupo ${id}`,
      effectiveStatus: mapGoogleStatus(g.status),
      objective: '',
      dailyBudget: 0,
      parentId: str(obj(R.campaign).id) || null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function parseAdNodes(catalogRows: GaqlRow[], metricRows: GaqlRow[]): MetaNodeInput[] {
  const idOf = (r: GaqlRow) => {
    const R = obj(r)
    const aga = obj(R.adGroupAd ?? R.ad_group_ad)
    const adId = str(obj(aga.ad).id)
    const agId = str(obj(R.adGroup ?? R.ad_group).id)
    return adId && agId ? `${agId}~${adId}` : ''
  }
  const metrics = metricsById(metricRows, idOf)
  const seen = new Set<string>()
  const out: MetaNodeInput[] = []
  for (const row of catalogRows) {
    const R = obj(row)
    const aga = obj(R.adGroupAd ?? R.ad_group_ad)
    const ad = obj(aga.ad)
    const id = idOf(row)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: str(ad.name) || `Anúncio ${str(ad.id)}`,
      effectiveStatus: mapGoogleStatus(aga.status),
      objective: '',
      dailyBudget: 0,
      parentId: str(obj(R.adGroup ?? R.ad_group).id) || null,
      metrics: metrics.get(id) ?? zeroMetrics(),
    })
  }
  return out
}

export function buildGoogleTree(
  campaigns: MetaNodeInput[],
  adGroups: MetaNodeInput[],
  ads: MetaNodeInput[]
): MetaCampaignNode[] {
  return buildMetaTree(campaigns, adGroups, ads)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/_lib/google-ads-tree.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-ads-tree.ts functions/_lib/google-ads-tree.test.ts
git commit -m "feat: pure Google Ads campaign-tree assembly"
```

---

### Task 4: `google-ads-overview` retorna `campaignTree` e aplica filtros GAQL

**Files:**
- Modify: `functions/api/admin/platform/google-ads-overview.ts`

Sem teste unitário direto (handler integra rede); a lógica pura já está testada nas Tasks 2–3. Verificação: typecheck + suite.

- [ ] **Step 1: Importar novos módulos**

No topo de `google-ads-overview.ts`:

```ts
import { parseGoogleDimensionFilters, gaqlFilterClause, type GoogleDimensionFilters } from '../../../_lib/google-ads-filters'
import { buildGoogleTree, parseCampaignNodes, parseAdGroupNodes, parseAdNodes } from '../../../_lib/google-ads-tree'
```

- [ ] **Step 2: Buscar árvore (catálogo sem data + métricas com data)**

Adicionar função no arquivo (perto de `fetchCampaignTypesGrouped`):

```ts
async function fetchGoogleCampaignTree(
  ver: string,
  numericId: string,
  headers: Record<string, string>,
  since: string,
  until: string
): Promise<{ tree: ReturnType<typeof buildGoogleTree>; error: string | null }> {
  const dateWhere = `segments.date BETWEEN '${since}' AND '${until}'`
  const queries = {
    campCatalog: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'`,
    campMetrics: `SELECT campaign.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE campaign.status != 'REMOVED' AND ${dateWhere}`,
    agCatalog: `SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id FROM ad_group WHERE ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
    agMetrics: `SELECT ad_group.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group WHERE ad_group.status != 'REMOVED' AND ${dateWhere}`,
    adCatalog: `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group.id FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
    adMetrics: `SELECT ad_group_ad.ad.id, ad_group.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND ${dateWhere}`,
  }
  const [campCat, campMet, agCat, agMet, adCat, adMet] = await Promise.all([
    fetchAllGaqlRows(ver, numericId, headers, queries.campCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.campMetrics),
    fetchAllGaqlRows(ver, numericId, headers, queries.agCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.agMetrics),
    fetchAllGaqlRows(ver, numericId, headers, queries.adCatalog),
    fetchAllGaqlRows(ver, numericId, headers, queries.adMetrics),
  ])
  const firstError =
    campCat.error || campMet.error || agCat.error || agMet.error || adCat.error || adMet.error || null
  if (campCat.error) return { tree: [], error: campCat.error }
  const tree = buildGoogleTree(
    parseCampaignNodes(campCat.rows, campMet.rows),
    parseAdGroupNodes(agCat.rows, agMet.rows),
    parseAdNodes(adCat.rows, adMet.rows)
  )
  return { tree, error: firstError }
}
```

- [ ] **Step 3: Aplicar filtros aos agregados e incluir árvore no body**

Em `buildGoogleOverviewBody`, adicionar parâmetro `filters: GoogleDimensionFilters` (depois de `compareUntil`). Aplicar:

```ts
  const filterClause = gaqlFilterClause(filters)
  const baseWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${since}' AND '${until}'${filterClause}`
```

`aggQuery`/`dailyQuery` já usam `baseWhere` — passam a filtrar. No bloco de compare, mesma coisa:

```ts
    const cmpWhere = `campaign.status != 'REMOVED' AND segments.date BETWEEN '${compareSince}' AND '${compareUntil}'${filterClause}`
```

Nas chamadas `fetchConversionBreakdown`, `fetchKeywordQualityList`, `fetchCampaignTypesGrouped`: adicionar parâmetro final `filterClause: string` em cada uma e concatenar no `WHERE` das queries internas (após a condição de data). Exemplo em `fetchConversionBreakdown` (query `metricsQuery`):

```ts
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${since}' AND '${until}'${filterClause}
```

(mesma alteração em `fetchKeywordQualityList` e `fetchCampaignTypesGrouped`; a query de catálogo `conversion_action` NÃO leva filtro — não tem campo campaign). `fetchGoogleDemographicsPayload` (arquivo `google-ads-demographics.ts`): adicionar parâmetro `filterClause = ''` com default e concatenar no WHERE das queries que filtram por `segments.date`.

Buscar a árvore em paralelo com os demais blocos (no `Promise.all` existente):

```ts
  const [conversionBreakdown, keywordQuality, campaignTypes, demographics, campaignTreeRes] = await Promise.all([
    fetchConversionBreakdown(ver, numericId, headers, since, until, filterClause),
    fetchKeywordQualityList(ver, numericId, headers, since, until, filterClause),
    fetchCampaignTypesGrouped(ver, numericId, headers, since, until, filterClause),
    fetchGoogleDemographicsPayload(ver, numericId, headers, since, until, fetchAllGaqlRows, filterClause),
    fetchGoogleCampaignTree(ver, numericId, headers, since, until),
  ])
```

No objeto retornado, adicionar:

```ts
    campaignTree: campaignTreeRes.tree,
    campaignsError: campaignTreeRes.error,
```

Nos retornos de erro/`configured:false` do handler, adicionar `campaignTree: [], campaignsError: null` para manter o contrato.

- [ ] **Step 4: Parsear filtros no handler e propagar**

Em `onRequestGet`, após `parseRangeParams`:

```ts
  const dimensionFilters = parseGoogleDimensionFilters(url)
```

Passar `dimensionFilters` nas duas chamadas `buildGoogleOverviewBody(...)` (último argumento).

- [ ] **Step 5: Verificar typecheck e suite**

Run: `npx tsc --noEmit -p .` (se o projeto tiver tsconfig para functions; senão `npx vitest run`)
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add functions/api/admin/platform/google-ads-overview.ts functions/api/admin/platform/google-ads-demographics.ts
git commit -m "feat: campaign tree + GAQL dimension filters in google-ads-overview"
```

---

### Task 5: Endpoint `google-campaign-status` (mutate)

**Files:**
- Create: `functions/api/admin/platform/google-campaign-status.ts`
- Test: `functions/api/admin/platform/google-campaign-status.test.ts`

Espelha `meta-campaign-status.ts`. Google usa `ENABLED`/`PAUSED`; o front fala `ACTIVE`/`PAUSED`. Nível `ad` usa id composto `adGroupId~adId` (resourceName `customers/{cid}/adGroupAds/{agId}~{adId}`).

- [ ] **Step 1: Write the failing test**

```ts
// functions/api/admin/platform/google-campaign-status.test.ts
import { describe, expect, test } from 'vitest'
import { normalizeGoogleMutateStatus, buildGoogleMutateRequest } from './google-campaign-status'

describe('normalizeGoogleMutateStatus', () => {
  test('ACTIVE vira ENABLED', () => expect(normalizeGoogleMutateStatus('ACTIVE')).toBe('ENABLED'))
  test('PAUSED mantém', () => expect(normalizeGoogleMutateStatus('PAUSED')).toBe('PAUSED'))
  test('inválido vira null', () => expect(normalizeGoogleMutateStatus('REMOVED')).toBeNull())
})

describe('buildGoogleMutateRequest', () => {
  test('campaign', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'campaign', '55', 'ENABLED')
    expect(r).not.toBeNull()
    expect(r!.url).toBe('https://googleads.googleapis.com/v20/customers/123/campaigns:mutate')
    expect(r!.body).toEqual({
      operations: [
        { update: { resourceName: 'customers/123/campaigns/55', status: 'ENABLED' }, updateMask: 'status' },
      ],
    })
  })

  test('adset vira adGroups', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'adset', '66', 'PAUSED')
    expect(r!.url).toContain('/adGroups:mutate')
    expect(r!.body.operations[0].update.resourceName).toBe('customers/123/adGroups/66')
  })

  test('ad exige id composto e vira adGroupAds', () => {
    const r = buildGoogleMutateRequest('v20', '123', 'ad', '66~99', 'PAUSED')
    expect(r!.url).toContain('/adGroupAds:mutate')
    expect(r!.body.operations[0].update.resourceName).toBe('customers/123/adGroupAds/66~99')
  })

  test('ad sem ~ é inválido', () => {
    expect(buildGoogleMutateRequest('v20', '123', 'ad', '99', 'PAUSED')).toBeNull()
  })

  test('id não numérico é inválido', () => {
    expect(buildGoogleMutateRequest('v20', '123', 'campaign', '55; DROP', 'PAUSED')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/api/admin/platform/google-campaign-status.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/api/admin/platform/google-campaign-status.ts
import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  customerPathId,
  resolveGoogleApiVersion,
  resolveGoogleLoginCustomerId,
} from '../../../_lib/google-ads-env'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'

export function normalizeGoogleMutateStatus(raw: unknown): 'ENABLED' | 'PAUSED' | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'ACTIVE' || s === 'ENABLED') return 'ENABLED'
  if (s === 'PAUSED') return 'PAUSED'
  return null
}

type MutateBody = {
  operations: { update: { resourceName: string; status: string }; updateMask: 'status' }[]
}

const LEVEL_RESOURCE: Record<string, string> = {
  campaign: 'campaigns',
  adset: 'adGroups',
  ad: 'adGroupAds',
}

export function buildGoogleMutateRequest(
  ver: string,
  customerId: string,
  level: string,
  id: string,
  status: 'ENABLED' | 'PAUSED'
): { url: string; body: MutateBody } | null {
  const resource = LEVEL_RESOURCE[level]
  if (!resource) return null
  const idOk = level === 'ad' ? /^\d+~\d+$/.test(id) : /^\d+$/.test(id)
  if (!idOk || !/^\d+$/.test(customerId)) return null
  return {
    url: `https://googleads.googleapis.com/${ver}/customers/${customerId}/${resource}:mutate`,
    body: {
      operations: [
        {
          update: { resourceName: `customers/${customerId}/${resource}/${id}`, status },
          updateMask: 'status',
        },
      ],
    },
  }
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  let payload: { orgId?: string; customerId?: string; id?: string; status?: string; level?: string }
  try {
    payload = await context.request.json()
  } catch {
    return jsonError('Corpo inválido', 400)
  }

  const orgId = String(payload.orgId ?? '').trim()
  const id = String(payload.id ?? '').trim()
  const level = String(payload.level ?? 'campaign').trim()
  const status = normalizeGoogleMutateStatus(payload.status)
  if (!id || !status) {
    return jsonError('Parâmetros obrigatórios: id, status (ACTIVE|PAUSED)', 400)
  }

  const env = context.env
  const devToken = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim()
  if (!devToken) return jsonError('GOOGLE_ADS_DEVELOPER_TOKEN não configurado', 409)

  let access: string | null = null
  let customerId = ''

  if (orgId) {
    if (!(await userCanAccessOrg(env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(env.DB, orgId, 'google_ads')
    if (!conn) return jsonError('Nenhuma conta Google Ads ligada a esta organização', 404)
    customerId = customerPathId(conn.external_id)
    access = conn.oauth_credential_id
      ? await getValidGoogleAccessTokenFromCredential(env.DB, env, conn.oauth_credential_id)
      : await getGoogleAccessTokenFromEnv(env)
  } else {
    if (user.role !== 'super_admin') return jsonError('orgId é obrigatório', 400)
    const cid = String(payload.customerId ?? '').trim() || env.GOOGLE_ADS_CUSTOMER_ID?.trim() || ''
    if (!cid) return jsonError('customerId é obrigatório no modo secrets', 400)
    customerId = customerPathId(cid)
    access = await getGoogleAccessTokenFromEnv(env)
  }

  if (!access) return jsonError('Token Google indisponível. Reconecte em Integrações.', 409)

  const ver = resolveGoogleApiVersion(env)
  const req = buildGoogleMutateRequest(ver, customerId, level, id, status)
  if (!req) return jsonError('Nível ou id inválido', 400)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
    'developer-token': devToken,
  }
  const loginId = resolveGoogleLoginCustomerId(env)
  if (loginId) headers['login-customer-id'] = loginId

  const res = await fetch(req.url, { method: 'POST', headers, body: JSON.stringify(req.body) })
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!res.ok || data.error) {
    return jsonError(data.error?.message || `Google Ads API (${res.status})`, 502)
  }
  return json({ ok: true, id, status })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/api/admin/platform/google-campaign-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/platform/google-campaign-status.ts functions/api/admin/platform/google-campaign-status.test.ts
git commit -m "feat: Google Ads campaign/adGroup/ad status mutate endpoint"
```

---

### Task 6: `useCampaignStatusMutation` genérico

**Files:**
- Modify: `src/hooks/useCampaignStatusMutation.js`
- Modify: `src/hooks/useCampaignStatusMutation.test.js`
- Modify: `src/pages/MetaAds.jsx` (call site, sem mudança de comportamento)

- [ ] **Step 1: Atualizar testes (failing)**

Em `src/hooks/useCampaignStatusMutation.test.js`, adicionar casos (manter os existentes adaptando a assinatura):

```js
test('usa endpoint custom e mescla extraBody', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  const { result } = renderHook(() =>
    useCampaignStatusMutation('org1', {
      endpoint: '/api/admin/platform/google-campaign-status',
      extraBody: { customerId: '123' },
    })
  )
  await act(() => result.current.mutate({ level: 'campaign', id: '5', nextStatus: 'ACTIVE' }))
  expect(globalThis.fetch).toHaveBeenCalledWith(
    '/api/admin/platform/google-campaign-status',
    expect.objectContaining({
      body: JSON.stringify({ orgId: 'org1', level: 'campaign', id: '5', status: 'ACTIVE', customerId: '123' }),
    })
  )
})

test('default continua endpoint Meta', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
  const { result } = renderHook(() => useCampaignStatusMutation('org1'))
  await act(() => result.current.mutate({ level: 'campaign', id: '5', nextStatus: 'PAUSED' }))
  expect(globalThis.fetch.mock.calls[0][0]).toBe('/api/admin/platform/meta-campaign-status')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useCampaignStatusMutation.test.js`
Expected: FAIL — endpoint fixo.

- [ ] **Step 3: Implementar**

```js
// src/hooks/useCampaignStatusMutation.js
import { useState, useCallback } from 'react'

const DEFAULT_ENDPOINT = '/api/admin/platform/meta-campaign-status'

/** POST status change to a platform mutate endpoint. Returns boolean ok; exposes error message. */
export function useCampaignStatusMutation(orgId, { endpoint = DEFAULT_ENDPOINT, extraBody = {} } = {}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async ({ level, id, nextStatus }) => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, level, id, status: nextStatus, ...extraBody }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) {
          setError(typeof data?.error === 'string' ? data.error : 'Falha ao atualizar status')
          return false
        }
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro de rede')
        return false
      } finally {
        setPending(false)
      }
    },
    [orgId, endpoint, JSON.stringify(extraBody)] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { mutate, pending, error }
}
```

`MetaAds.jsx` continua chamando `useCampaignStatusMutation(activeOrgId)` — sem mudança.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/hooks/useCampaignStatusMutation.test.js`
Expected: PASS (novos + antigos)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCampaignStatusMutation.js src/hooks/useCampaignStatusMutation.test.js
git commit -m "feat: parametrize campaign status mutation endpoint"
```

---

### Task 7: `CampaignTree` genérico (labels por plataforma)

**Files:**
- Modify: `src/components/CampaignTree.jsx`
- Modify: `src/components/CampaignTree.test.jsx`

Props novas com defaults Meta (zero breaking change): `labels = { adsets: 'Conjuntos', ads: 'Anúncios' }` e `resultsLabel = null` (quando string, sobrepõe o mapa `OBJECTIVE_RESULT_LABEL`).

- [ ] **Step 1: Adicionar testes (failing)**

Em `src/components/CampaignTree.test.jsx`:

```jsx
test('labels custom para Google', async () => {
  const tree = [
    {
      id: '1', name: 'Camp', effectiveStatus: 'ACTIVE', objective: 'SEARCH', dailyBudget: 0,
      metrics: { spend: 10, results: 2, ctrLink: 1, cpm: 5 },
      adsets: [
        {
          id: '11', name: 'Grupo X', effectiveStatus: 'ACTIVE', objective: '', dailyBudget: 0,
          metrics: { spend: 10, results: 2, ctrLink: 1, cpm: 5 }, ads: [],
        },
      ],
    },
  ]
  render(
    <CampaignTree
      tree={tree}
      onToggleStatus={() => {}}
      labels={{ adsets: 'Grupos de anúncios', ads: 'Anúncios' }}
      resultsLabel="Conversões"
    />
  )
  await userEvent.click(screen.getByLabelText('expandir Camp'))
  expect(screen.getByText(/Grupos de anúncios/)).toBeInTheDocument()
  expect(screen.getAllByText('Conversões').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/CampaignTree.test.jsx`
Expected: FAIL — "Conjuntos" hardcoded.

- [ ] **Step 3: Implementar**

Em `CampaignTree.jsx`:

```jsx
const DEFAULT_LABELS = { adsets: 'Conjuntos', ads: 'Anúncios' }

function resultLabel(objective, resultsLabel) {
  if (resultsLabel) return resultsLabel
  return OBJECTIVE_RESULT_LABEL[String(objective ?? '').toUpperCase()] || 'Resultados'
}
```

Propagar `labels`/`resultsLabel` por props: `CampaignTree({ tree, onToggleStatus, labels = DEFAULT_LABELS, resultsLabel = null })` → `CampaignBlock` → `AdsetBlock` → `NodeMetrics`/`AdCard`/`SectionHeader`. `SectionHeader` de conjuntos usa `labels.adsets`, de anúncios usa `labels.ads`. `NodeMetrics` recebe `resultsLabel` e usa `resultLabel(node.objective, resultsLabel)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/CampaignTree.test.jsx`
Expected: PASS (novos + antigos)

- [ ] **Step 5: Commit**

```bash
git add src/components/CampaignTree.jsx src/components/CampaignTree.test.jsx
git commit -m "feat: platform-agnostic labels in CampaignTree"
```

---

### Task 8: `DashboardFiltersContext` — `filterOptions` + valores `{id,name}`

**Files:**
- Modify: `src/context/DashboardFiltersContext.jsx`
- Test: `src/context/DashboardFiltersContext.test.jsx` (criar)

`dimensionFilters` passa a guardar `{ id, name }` por chave. `filterOptions` é `{ [filterKey]: Array<{id, name}> }`, publicado pelas páginas.

- [ ] **Step 1: Write the failing test**

```jsx
// src/context/DashboardFiltersContext.test.jsx
import { describe, expect, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DashboardFiltersProvider, useDashboardFilters } from './DashboardFiltersContext'

const wrapper = ({ children }) => <DashboardFiltersProvider>{children}</DashboardFiltersProvider>

describe('filterOptions', () => {
  test('começa vazio e aceita publicação', () => {
    const { result } = renderHook(() => useDashboardFilters(), { wrapper })
    expect(result.current.filterOptions).toEqual({})
    act(() => result.current.setFilterOptions({ campanha: [{ id: '1', name: 'Camp A' }] }))
    expect(result.current.filterOptions.campanha).toHaveLength(1)
  })

  test('dimensionFilters guarda objetos {id,name}', () => {
    const { result } = renderHook(() => useDashboardFilters(), { wrapper })
    act(() => result.current.setDimensionFilters({ campanha: { id: '1', name: 'Camp A' } }))
    expect(result.current.dimensionFilters.campanha.id).toBe('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/context/DashboardFiltersContext.test.jsx`
Expected: FAIL — `filterOptions` undefined.

- [ ] **Step 3: Implementar**

Em `DashboardFiltersContext.jsx`, adicionar estado e expor no value:

```jsx
  const [filterOptions, setFilterOptions] = useState({})
```

No `useMemo` do value: incluir `filterOptions, setFilterOptions` (e no array de deps `filterOptions`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/context/DashboardFiltersContext.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/context/DashboardFiltersContext.jsx src/context/DashboardFiltersContext.test.jsx
git commit -m "feat: filter options publishing in dashboard filters context"
```

---

### Task 9: `PlatformOverviewProvider` — refresh por evento

**Files:**
- Modify: `src/components/PlatformOverviewProvider.jsx`
- Test: `src/components/PlatformOverviewProvider.test.jsx` (criar)

Evento global `p12-overview-refresh` força refetch (usado pelo botão refresh do FilterBar em qualquer página).

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/PlatformOverviewProvider.test.jsx
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { PlatformOverviewProvider, usePlatformOverview } from './PlatformOverviewProvider'

function Probe() {
  const { data } = usePlatformOverview()
  return <span>{data?.n ?? 'none'}</span>
}

describe('PlatformOverviewProvider refresh', () => {
  beforeEach(() => {
    let n = 0
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ n: ++n }),
    }))
  })

  test('refaz fetch ao receber p12-overview-refresh', async () => {
    render(
      <PlatformOverviewProvider url="/api/x">
        <Probe />
      </PlatformOverviewProvider>
    )
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    act(() => {
      window.dispatchEvent(new CustomEvent('p12-overview-refresh'))
    })
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/PlatformOverviewProvider.test.jsx`
Expected: FAIL — continua `1`.

- [ ] **Step 3: Implementar**

```jsx
// dentro de PlatformOverviewProvider
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1)
    window.addEventListener('p12-overview-refresh', bump)
    return () => window.removeEventListener('p12-overview-refresh', bump)
  }, [])
```

E no useEffect do fetch, trocar deps `[url]` → `[url, refreshKey]`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/PlatformOverviewProvider.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PlatformOverviewProvider.jsx src/components/PlatformOverviewProvider.test.jsx
git commit -m "feat: global refresh event for platform overview"
```

---

### Task 10: Filtros server-side no `meta-overview`

**Files:**
- Create: `functions/_lib/meta-filtering.ts`
- Test: `functions/_lib/meta-filtering.test.ts`
- Modify: `functions/api/admin/platform/meta-overview.ts`

- [ ] **Step 1: Write the failing test**

```ts
// functions/_lib/meta-filtering.test.ts
import { describe, expect, test } from 'vitest'
import { parseMetaDimensionFilters, metaFilteringQuery } from './meta-filtering'

describe('parseMetaDimensionFilters', () => {
  test('extrai ids', () => {
    const url = new URL('https://x/api?campaign_ids=1,2&adset_id=3&ad_id=4')
    expect(parseMetaDimensionFilters(url)).toEqual({ campaignIds: ['1', '2'], adsetId: '3', adId: '4' })
  })
})

describe('metaFilteringQuery', () => {
  test('vazio sem filtros', () => {
    expect(metaFilteringQuery({ campaignIds: [], adsetId: null, adId: null })).toBe('')
  })

  test('monta filtering JSON com IN', () => {
    const q = metaFilteringQuery({ campaignIds: ['1', '2'], adsetId: null, adId: null })
    expect(q).toContain('&filtering=')
    const parsed = JSON.parse(decodeURIComponent(q.replace('&filtering=', '')))
    expect(parsed).toEqual([{ field: 'campaign.id', operator: 'IN', values: ['1', '2'] }])
  })

  test('adset e ad entram como filtros adicionais', () => {
    const q = metaFilteringQuery({ campaignIds: [], adsetId: '3', adId: '4' })
    const parsed = JSON.parse(decodeURIComponent(q.replace('&filtering=', '')))
    expect(parsed).toEqual([
      { field: 'adset.id', operator: 'IN', values: ['3'] },
      { field: 'ad.id', operator: 'IN', values: ['4'] },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/_lib/meta-filtering.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/_lib/meta-filtering.ts
export type MetaDimensionFilters = {
  campaignIds: string[]
  adsetId: string | null
  adId: string | null
}

function sanitizeId(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return /^\d+$/.test(s) ? s : null
}

export function parseMetaDimensionFilters(url: URL): MetaDimensionFilters {
  const rawIds = url.searchParams.get('campaign_ids')?.split(',') ?? []
  return {
    campaignIds: rawIds.map(sanitizeId).filter((s): s is string => s != null),
    adsetId: sanitizeId(url.searchParams.get('adset_id')),
    adId: sanitizeId(url.searchParams.get('ad_id')),
  }
}

/** Sufixo `&filtering=[...]` para URLs de insights da Graph API. Vazio sem filtros. */
export function metaFilteringQuery(f: MetaDimensionFilters): string {
  const rules: { field: string; operator: 'IN'; values: string[] }[] = []
  if (f.campaignIds.length) rules.push({ field: 'campaign.id', operator: 'IN', values: f.campaignIds })
  if (f.adsetId) rules.push({ field: 'adset.id', operator: 'IN', values: [f.adsetId] })
  if (f.adId) rules.push({ field: 'ad.id', operator: 'IN', values: [f.adId] })
  if (!rules.length) return ''
  return `&filtering=${encodeURIComponent(JSON.stringify(rules))}`
}
```

- [ ] **Step 4: Aplicar no `meta-overview.ts`**

Importar:

```ts
import { parseMetaDimensionFilters, metaFilteringQuery } from '../../../_lib/meta-filtering'
```

No handler, após parse de range: `const filtering = metaFilteringQuery(parseMetaDimensionFilters(url))` e propagar `filtering: string` para `buildMetaResponse` → `fetchInsightsAggregate`, `fetchInsightsDaily`, `fetchPlacementsBreakdown` (parâmetro novo `filtering = ''`). Em cada uma, concatenar na URL de insights:

```ts
    `https://graph.facebook.com/v21.0/${actId}/insights?fields=...&access_token=...${filtering}`
```

As buscas da árvore (`fetchCampaignsCatalog`, `fetchAdsetsCatalog`, `fetchAdLevelInsights`, etc.) **não** recebem filtering — árvore volta completa.

- [ ] **Step 5: Run tests**

Run: `npx vitest run functions/_lib/meta-filtering.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/meta-filtering.ts functions/_lib/meta-filtering.test.ts functions/api/admin/platform/meta-overview.ts
git commit -m "feat: server-side dimension filtering in meta-overview"
```

---

### Task 11: Derivação de opções de filtro a partir da árvore

**Files:**
- Create: `src/lib/filterOptionsFromTree.js`
- Test: `src/lib/filterOptionsFromTree.test.js`

Função pura usada pelas páginas para publicar opções no contexto.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/filterOptionsFromTree.test.js
import { describe, expect, test } from 'vitest'
import { filterOptionsFromTree, resolveTreeSlice } from './filterOptionsFromTree'

const tree = [
  {
    id: '1', name: 'Camp A', objective: 'OUTCOME_LEADS',
    adsets: [
      { id: '11', name: 'Set 1', ads: [{ id: '111', name: 'Ad 1' }] },
      { id: '12', name: 'Set 2', ads: [] },
    ],
  },
  { id: '2', name: 'Camp B', objective: 'OUTCOME_TRAFFIC', adsets: [] },
]

describe('filterOptionsFromTree', () => {
  test('extrai campanhas, filhos e objetivos', () => {
    const o = filterOptionsFromTree(tree)
    expect(o.campanha).toEqual([
      { id: '1', name: 'Camp A' },
      { id: '2', name: 'Camp B' },
    ])
    expect(o.children).toEqual([
      { id: '11', name: 'Set 1', campaignId: '1' },
      { id: '12', name: 'Set 2', campaignId: '1' },
    ])
    expect(o.ads).toEqual([{ id: '111', name: 'Ad 1', adsetId: '11', campaignId: '1' }])
    expect(o.objetivo).toEqual([
      { id: 'OUTCOME_LEADS', name: 'OUTCOME_LEADS', campaignIds: ['1'] },
      { id: 'OUTCOME_TRAFFIC', name: 'OUTCOME_TRAFFIC', campaignIds: ['2'] },
    ])
  })
})

describe('resolveTreeSlice', () => {
  test('sem filtros retorna árvore inteira', () => {
    expect(resolveTreeSlice(tree, {})).toHaveLength(2)
  })

  test('filtra por campanha', () => {
    const out = resolveTreeSlice(tree, { campanha: { id: '1' } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('1')
  })

  test('filtra por filho (adset/grupo) mantendo só o ramo', () => {
    const out = resolveTreeSlice(tree, { children: { id: '12' } })
    expect(out).toHaveLength(1)
    expect(out[0].adsets).toHaveLength(1)
    expect(out[0].adsets[0].id).toBe('12')
  })

  test('filtra por objetivo via campaignIds', () => {
    const out = resolveTreeSlice(tree, { objetivo: { id: 'OUTCOME_TRAFFIC', campaignIds: ['2'] } })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('2')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/filterOptionsFromTree.test.js`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```js
// src/lib/filterOptionsFromTree.js

/**
 * Deriva opções de filtro de uma árvore campanha→filhos(adsets)→ads.
 * Chaves neutras: `campanha`, `children` (conjuntos/grupos), `ads`, `objetivo`.
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
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/filterOptionsFromTree.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/filterOptionsFromTree.js src/lib/filterOptionsFromTree.test.js
git commit -m "feat: derive filter options + tree slice from campaign tree"
```

---

### Task 12: FilterBar reescrito — opções reais, busca, chips, limpar, refresh genérico

**Files:**
- Modify: `src/components/FilterBar.jsx`
- Test: `src/components/FilterBar.test.jsx` (criar)
- Modify: `src/index.css` (`.filter-select`)

**Mudanças:**
- Deleta `FILTER_OPTIONS` mock e todo o fetch `meta-ads-filters`/`metaLive`.
- `PAGE_FILTERS` novo (só filtros com dados reais):

```js
const PAGE_FILTERS = {
  Geral: ['dateRange'],
  'Meta Ads': ['dateRange', 'campanha', 'children', 'ads', 'objetivo'],
  'Google Ads': ['dateRange', 'campanha', 'children', 'objetivo'],
  'Google Meu Negócio': ['dateRange'],
  Instagram: ['dateRange'],
  Configurações: [],
  Clientes: [],
}

const FILTER_LABELS = {
  campanha: { 'Meta Ads': 'Campanha', 'Google Ads': 'Campanha' },
  children: { 'Meta Ads': 'Conjunto de Anúncios', 'Google Ads': 'Grupo de Anúncios' },
  ads: { 'Meta Ads': 'Anúncio' },
  objetivo: { 'Meta Ads': 'Objetivo', 'Google Ads': 'Tipo de campanha' },
}
```

- `FilterSelect` novo: lê `filterOptions[key]` do contexto; dropdown com `<input>` de busca (filtra por substring case-insensitive quando >8 opções); opção "Todos" limpa a chave; selecionado mostra `name` truncado e X inline para limpar.
- Barra mostra botão "Limpar filtros" quando `Object.keys(dimensionFilters).length > 0`.
- Refresh: `window.dispatchEvent(new CustomEvent('p12-overview-refresh'))` + spin de 800ms (remove o fetch Meta hardcoded).
- `.filter-select` em `src/index.css`: `px-4 py-2` → `h-8 px-3 text-xs` (`@apply bg-surface-card border border-surface-border rounded-md h-8 px-3 flex items-center gap-2 cursor-pointer transition-all hover:bg-surface-hover hover:border-brand/40 select-none text-xs;`). Ícones internos (Calendar/ChevronDown/Columns2) passam a `size={12}`.
- Mantém: date presets, `InlineRangePicker`, comparação de KPIs (intactos).
- `useEffect` que reseta `dimensionFilters` ao trocar de página: mantém.

- [ ] **Step 1: Write the failing test**

```jsx
// src/components/FilterBar.test.jsx
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterBar from './FilterBar'
import { DashboardFiltersProvider, useDashboardFilters } from '@/context/DashboardFiltersContext'

vi.mock('@/context/OrgWorkspaceContext', () => ({
  useOrgWorkspace: () => ({ activeOrgId: 'org1' }),
}))

function renderWithOptions(page, options) {
  function Publisher() {
    const { setFilterOptions } = useDashboardFilters()
    useEffect(() => {
      setFilterOptions(options)
    }, [setFilterOptions])
    return <FilterBar activePage={page} />
  }
  return render(
    <DashboardFiltersProvider>
      <Publisher />
    </DashboardFiltersProvider>
  )
}

import { useEffect } from 'react'

describe('FilterBar', () => {
  test('Geral mostra só data (sem selects de dimensão)', () => {
    renderWithOptions('Geral', {})
    expect(screen.queryByText('Campanha')).not.toBeInTheDocument()
  })

  test('Meta Ads lista campanhas reais publicadas no contexto', async () => {
    renderWithOptions('Meta Ads', { campanha: [{ id: '1', name: 'Camp Real' }] })
    await userEvent.click(screen.getByRole('button', { name: /campanha/i }))
    expect(screen.getByText('Camp Real')).toBeInTheDocument()
  })

  test('seleção mostra chip e botão limpar', async () => {
    renderWithOptions('Meta Ads', { campanha: [{ id: '1', name: 'Camp Real' }] })
    await userEvent.click(screen.getByRole('button', { name: /campanha/i }))
    await userEvent.click(screen.getByText('Camp Real'))
    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/FilterBar.test.jsx`
Expected: FAIL — opções mock, sem aria-label/limpar.

- [ ] **Step 3: Implementar FilterSelect novo**

Substituir `FilterSelect` em `FilterBar.jsx`:

```jsx
function FilterSelect({ filterKey, label, value, options, onChange, onClear }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    const close = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      setOpen(false)
    }
    window.addEventListener('pointerdown', close, true)
    return () => window.removeEventListener('pointerdown', close, true)
  }, [open])

  const list = Array.isArray(options) ? options : []
  const filtered = query
    ? list.filter((o) => o.name?.toLowerCase().includes(query.toLowerCase()))
    : list
  const showSearch = list.length > 8

  return (
    <div className="relative z-[60]" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={cn('filter-select', value && 'border-brand/40 bg-brand/10')}
      >
        <span className="max-w-[160px] truncate text-white">{value?.name || label}</span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Limpar ${label}`}
            onClick={(e) => {
              e.stopPropagation()
              onClear(filterKey)
            }}
            onKeyDown={(e) => e.key === 'Enter' && onClear(filterKey)}
            className="shrink-0 text-muted-foreground hover:text-white"
          >
            <X size={12} />
          </span>
        ) : (
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-[70] mt-2 max-h-64 min-w-[220px] overflow-y-auto rounded-lg border border-surface-border bg-surface-card py-2 shadow-xl animate-scale-in">
          {showSearch && (
            <div className="px-2 pb-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-surface-border bg-surface-input px-2 py-1.5 text-xs text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              onClear(filterKey)
              setOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
          >
            Todos
          </button>
          {filtered.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">Sem opções no período.</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(filterKey, opt)
                  setOpen(false)
                }}
                className={cn(
                  'w-full truncate px-4 py-2 text-left text-xs hover:bg-surface-hover transition-colors',
                  value?.id === opt.id ? 'text-brand' : 'text-white'
                )}
                title={opt.name}
              >
                {opt.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Implementar corpo do FilterBar**

No componente principal: remover `metaLive`, `metaOptionsFor`, os dois `useEffect` de fetch Meta e o fetch no `handleRefresh`. Adicionar `filterOptions` do contexto. Renderização dos selects:

```jsx
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {activeFilters
            .filter((f) => f !== 'dateRange')
            .map((filterKey) => (
              <FilterSelect
                key={filterKey}
                filterKey={filterKey}
                label={FILTER_LABELS[filterKey]?.[activePage] ?? filterKey}
                value={dimensionFilters[filterKey] || null}
                options={filterOptions[filterKey]}
                onChange={(key, opt) => setDimensionFilters((prev) => ({ ...prev, [key]: opt }))}
                onClear={(key) =>
                  setDimensionFilters((prev) => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                  })
                }
              />
            ))}
          {Object.keys(dimensionFilters).length > 0 && (
            <button
              type="button"
              onClick={() => setDimensionFilters({})}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-white"
            >
              <X size={12} /> Limpar filtros
            </button>
          )}
        </div>
```

`handleRefresh`:

```jsx
  const handleRefresh = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('p12-overview-refresh'))
    setTimeout(() => setRefreshing(false), 800)
  }
```

Imports lucide: trocar para `{ Calendar, ChevronDown, RefreshCw, Columns2, X }`. Ícones `Calendar`/`ChevronDown`/`Columns2` nos botões de data/comparação: `size={12}`. `RefreshCw size={14}` e botão refresh `h-8 w-8`. Title do refresh: `"Atualizar dados da página"`.

Atualizar `.filter-select` em `src/index.css` conforme descrito acima.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/FilterBar.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/FilterBar.jsx src/components/FilterBar.test.jsx src/index.css
git commit -m "feat: real filter options, search, chips and generic refresh in FilterBar"
```

---

### Task 13: Meta Ads — publicar opções + enviar filtros + recorte da árvore

**Files:**
- Modify: `src/pages/MetaAds.jsx`

- [ ] **Step 1: Publicar opções e aplicar recorte**

Em `MetaCampaignsBlock` (que já tem `tree` do overview):

```jsx
import { filterOptionsFromTree, resolveTreeSlice } from '@/lib/filterOptionsFromTree'
```

```jsx
  const { dimensionFilters, setFilterOptions } = useDashboardFilters()

  useEffect(() => {
    if (!Array.isArray(data?.campaignTree)) return
    const o = filterOptionsFromTree(data.campaignTree)
    setFilterOptions({ campanha: o.campanha, children: o.children, ads: o.ads, objetivo: o.objetivo })
  }, [data?.campaignTree, setFilterOptions])

  const visibleTree = useMemo(
    () => resolveTreeSlice(tree, dimensionFilters),
    [tree, dimensionFilters]
  )
```

Renderizar `<CampaignTree tree={visibleTree} ... />`. Limpar opções ao desmontar:

```jsx
  useEffect(() => () => setFilterOptions({}), [setFilterOptions])
```

- [ ] **Step 2: Enviar filtros no overview URL**

No componente `MetaAds` (onde monta `overviewUrl` com `buildPlatformOverviewUrl`):

```jsx
  const { dateRange, compareDateRange, comparePrimaryKpi, dimensionFilters } = useDashboardFilters()

  const apiFilters = useMemo(() => {
    const f = {}
    if (dimensionFilters.objetivo?.campaignIds?.length) f.campaignIds = dimensionFilters.objetivo.campaignIds
    if (dimensionFilters.campanha?.id) f.campaignIds = [dimensionFilters.campanha.id]
    if (dimensionFilters.children?.id) f.adsetId = dimensionFilters.children.id
    if (dimensionFilters.ads?.id) f.adId = dimensionFilters.ads.id
    return f
  }, [dimensionFilters])
```

E passar `filters: apiFilters` no objeto do `buildPlatformOverviewUrl`. (Campanha explícita ganha de objetivo — ordem das atribuições acima.)

- [ ] **Step 3: Verificar suite + smoke manual**

Run: `npx vitest run`
Expected: PASS. Manual: selecionar campanha no FilterBar → KPIs mudam, árvore mostra só o ramo.

- [ ] **Step 4: Commit**

```bash
git add src/pages/MetaAds.jsx
git commit -m "feat: Meta Ads publishes filter options and applies server-side filters"
```

---

### Task 14: Google Ads — bloco de campanhas com switch + filtros

**Files:**
- Modify: `src/pages/GoogleAds.jsx`

- [ ] **Step 1: Criar `GoogleCampaignsBlock`**

Espelho do `MetaCampaignsBlock` (ver `src/pages/MetaAds.jsx:33-100` como referência), com labels Google:

```jsx
import { useEffect, useMemo, useState } from 'react' // já importado — conferir
import { CampaignTree } from '@/components/CampaignTree'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCampaignStatusMutation } from '@/hooks/useCampaignStatusMutation'
import { filterOptionsFromTree, resolveTreeSlice } from '@/lib/filterOptionsFromTree'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'

const GOOGLE_TREE_LABELS = { adsets: 'Grupos de anúncios', ads: 'Anúncios' }

function GoogleCampaignsBlock({ workerPlatformQuery }) {
  const { activeOrgId } = useOrgWorkspace()
  const { loading, data } = usePlatformOverview()
  const { dimensionFilters, setFilterOptions } = useDashboardFilters()
  const customerId = useMemo(() => {
    const m = /(?:^|&)customer_id=([^&]+)/.exec(workerPlatformQuery || '')
    return m ? decodeURIComponent(m[1]) : ''
  }, [workerPlatformQuery])
  const { mutate } = useCampaignStatusMutation(activeOrgId, {
    endpoint: '/api/admin/platform/google-campaign-status',
    extraBody: customerId ? { customerId } : {},
  })
  const [tree, setTree] = useState([])
  const [pendingToggle, setPendingToggle] = useState(null)

  useEffect(() => {
    setTree(Array.isArray(data?.campaignTree) ? data.campaignTree : [])
  }, [data?.campaignTree])

  useEffect(() => {
    if (!Array.isArray(data?.campaignTree)) return
    const o = filterOptionsFromTree(data.campaignTree)
    setFilterOptions({ campanha: o.campanha, children: o.children, objetivo: o.objetivo })
  }, [data?.campaignTree, setFilterOptions])

  useEffect(() => () => setFilterOptions({}), [setFilterOptions])

  const visibleTree = useMemo(() => resolveTreeSlice(tree, dimensionFilters), [tree, dimensionFilters])

  const applyStatusLocally = (id, nextStatus) => {
    const walk = (nodes) =>
      nodes.map((n) => ({
        ...n,
        effectiveStatus: n.id === id ? nextStatus : n.effectiveStatus,
        adsets: n.adsets ? walk(n.adsets) : n.adsets,
        ads: n.ads ? walk(n.ads) : n.ads,
      }))
    setTree((t) => walk(t))
  }

  const confirmToggle = async () => {
    const t = pendingToggle
    setPendingToggle(null)
    if (!t) return
    const prev = t.nextStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    applyStatusLocally(t.id, t.nextStatus)
    const ok = await mutate({ level: t.level, id: t.id, nextStatus: t.nextStatus })
    if (!ok) applyStatusLocally(t.id, prev)
  }

  return (
    <BlockCard
      title="Campanhas"
      state={loading ? 'loading' : visibleTree.length === 0 ? 'empty' : 'ready'}
      emptyMessage="Sem campanhas no período."
      errorMessage={String(data?.campaignsError || '')}
      bodyClassName="overflow-auto px-4 pb-4"
    >
      <CampaignTree
        tree={visibleTree}
        onToggleStatus={(node) => setPendingToggle(node)}
        labels={GOOGLE_TREE_LABELS}
        resultsLabel="Conversões"
      />
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar?' : 'Ativar?'}
        description={`${pendingToggle?.name ?? ''} será ${pendingToggle?.nextStatus === 'PAUSED' ? 'pausado(a)' : 'ativado(a)'} no Google Ads.`}
        onConfirm={confirmToggle}
      />
    </BlockCard>
  )
}
```

**Atenção:** conferir a assinatura exata do `ConfirmDialog` no uso em `MetaAds.jsx` e replicar (props podem diferir do snippet — ajustar para o real). Mesmo para o handler de rollback: copiar o padrão exato do `MetaCampaignsBlock`.

- [ ] **Step 2: Registrar bloco e enviar filtros**

Em `GOOGLE_DASHBOARD_BLOCKS`, adicionar após `google-metrics`:

```jsx
  {
    id: 'google-campaigns-tree',
    tier: 'secondary',
    defaultColSpan: 8,
    defaultRowSpan: 5,
    minColSpan: 4,
    maxColSpan: 8,
    minRowSpan: 3,
    maxRowSpan: 12,
    render: ({ workerPlatformQuery }) => <GoogleCampaignsBlock workerPlatformQuery={workerPlatformQuery} />,
  },
```

(Se `DashboardGrid` não repassar props ao `render`, passar `workerPlatformQuery` via closure: definir `GOOGLE_DASHBOARD_BLOCKS` dentro de `GoogleAdsInner` com `useMemo`.)

No componente `GoogleAds` (overviewUrl), igual ao Meta:

```jsx
  const { dateRange, compareDateRange, comparePrimaryKpi, dimensionFilters } = useDashboardFilters()
  const apiFilters = useMemo(() => {
    const f = {}
    if (dimensionFilters.objetivo?.campaignIds?.length) f.campaignIds = dimensionFilters.objetivo.campaignIds
    if (dimensionFilters.campanha?.id) f.campaignIds = [dimensionFilters.campanha.id]
    if (dimensionFilters.children?.id) f.adGroupId = dimensionFilters.children.id
    return f
  }, [dimensionFilters])
```

`filters: apiFilters` no `buildPlatformOverviewUrl`.

- [ ] **Step 3: Run suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/GoogleAds.jsx
git commit -m "feat: Google Ads campaign tree with status switch and live filters"
```

---

### Task 15: Shell polish — Sidebar + Header

**Files:**
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/components/Header.jsx`

Sem testes novos (mudança visual); suite existente deve continuar verde.

- [ ] **Step 1: Sidebar**

- Ícones de navegação: `size={15}` → `size={16}` (2 ocorrências: nav items e Configurações).
- Chevrons de recolher: `size={14}` → `size={16}`.
- `gap-2` da nav → `gap-1` (itens mais coesos); `px-2 py-2` dos botões mantém (já é escala 4px).

- [ ] **Step 2: Header**

- `Menu`/`X` (toggle mobile): `size={15}` → `size={16}`; botão `w-7 h-7` → `h-9 w-9` mobile área de toque.
- `Activity`/`Bell`: `size={14}` → `size={16}`; botões `w-7 h-7` → `h-9 w-9`? Não — header tem `h-11`; usar `h-8 w-8` para os botões de ação e ícones 16.
- `User size={11}` → `size={12}`; `ChevronDown size={11}` → `size={12}`.
- Selects de organização/fonte: `text-[10px]` → `text-xs`, `py-1.5 px-2` → `h-8 px-2` (alinhados com `.filter-select`).
- Botão de conta: `py-1.5` → `h-8`, `text-[11px]` → `text-xs`.

- [ ] **Step 3: Run suite + visual check**

Run: `npx vitest run`
Expected: PASS. Manual: `npm run dev`, conferir alinhamento do header (controles todos h-8, ícones de ação 16, inline 12).

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.jsx src/components/Header.jsx
git commit -m "style: unify shell icon sizes and control heights"
```

---

### Task 16: Cleanup — aposentar meta-ads-filters + varredura final

**Files:**
- Delete: `functions/api/orgs/[id]/meta-ads-filters.ts` (confirmar caminho com glob antes)
- Verify: sem referências restantes

- [ ] **Step 1: Confirmar que nada mais usa o endpoint**

Run: `grep -rn "meta-ads-filters" src/ functions/`
Expected: nenhuma referência em `src/` (FilterBar já limpo na Task 12). Se o arquivo do endpoint existir, deletar; se houver teste dele, deletar junto.

- [ ] **Step 2: Varredura de mock remanescente**

Run: `grep -rn "Campanha_Leads_SP\|FILTER_OPTIONS" src/`
Expected: nenhuma ocorrência.

- [ ] **Step 3: Suite completa + build**

Run: `npx vitest run && npm run build`
Expected: tudo verde, build sem erros.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: retire meta-ads-filters endpoint and mock filter remnants"
```

---

## Verificação final (manual, com dados reais)

1. Meta Ads: selecionar campanha → KPIs/gráficos/funil mudam (server-side); árvore mostra só o ramo; limpar filtros restaura.
2. Google Ads: árvore aparece com cores de status; pausar campanha → ConfirmDialog → switch muda (ou reverte com erro claro se token/permissão faltar).
3. Geral/Instagram/GMN: só filtro de data; sem selects mock.
4. Refresh do FilterBar atualiza a página ativa em todas as telas.
5. Header/Sidebar: ícones e alturas consistentes.

## Riscos conhecidos

- Contas Google grandes: 6 queries GAQL da árvore podem pesar — se latência > ~4s, limitar `adCatalog`/`adMetrics` aos top N grupos por gasto (decisão na implementação).
- Mutate Google exige MCC (`login-customer-id`) correto — reusa resolução do overview.
- Switch Meta segue dependente de token com `ads_management` (caveat SP1 — não é bug).
