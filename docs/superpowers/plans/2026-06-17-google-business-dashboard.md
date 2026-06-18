# Google Business Profile Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock "Google Meu Negócio" tab with a real, data-driven dashboard (KPIs, daily chart, search-terms table, reviews, multi-location) mirroring the Google Ads page.

**Architecture:** New backend `google-business-overview` returns a per-section payload (locations, metrics+daily, searchKeywords, reviews, byLocation), each section carrying its own `error` for graceful degradation. Pure parse/aggregate helpers live in `functions/_lib/google-business-*.ts` and take an injected HTTP getter for testability. Frontend mirrors `GoogleAds.jsx`: `PlatformOverviewProvider` + `buildPlatformOverviewUrl` (with `location_id`) + blocks consuming `usePlatformOverview()`.

**Tech Stack:** Cloudflare Pages Functions (TypeScript), React 18, recharts, @tanstack/react-table, vitest, Tailwind. Google APIs: Business Profile Performance, Business Information, Account Management, My Business v4 (reviews).

## Global Constraints

- Auth: reuse `getGoogleAccessTokenFromEnv(env)` / `getValidGoogleAccessTokenFromCredential` — same Google OAuth refresh token with `business.manage` scope. No developer-token (Ads only).
- Per-section graceful degradation: every fetch wrapped in try/catch, returns `{ items: [], error }`; one failure never throws the whole payload. Mirror `google-ads-overview.ts`.
- Date params: `since`/`until` are `YYYY-MM-DD` (from `buildPlatformOverviewUrl`). Performance → `dailyRange`, keywords → `monthlyRange`, reviews → no range.
- GBP brand color: green `#34A853` (primary), blue `#4285F4` (secondary).
- KPI metric object shape (matches Google Ads): `{ label: string, value: string, deltaPct: number | null }`.
- Tables use `usePagedRows` + `TablePagination` from `src/components/ui/TablePagination.jsx`.
- Tests: `npx vitest run` and `npx vite build` must pass before the final task is considered done.
- Run commands from repo root `c:/IA/P12/01. Automações Ativas/dashboard-v2`.

---

## File Structure

**Create:**
- `functions/_lib/google-business-performance.ts` — daily metrics parse/aggregate + fetch.
- `functions/_lib/google-business-performance.test.ts`
- `functions/_lib/google-business-keywords.ts` — search-keywords parse + fetch.
- `functions/_lib/google-business-keywords.test.ts`
- `functions/_lib/google-business-reviews.ts` — reviews parse (starRating→number, distribution) + fetch.
- `functions/_lib/google-business-reviews.test.ts`
- `functions/_lib/google-business-locations.ts` — locations parse + fetch.
- `functions/_lib/google-business-overview-core.ts` — payload assembly (injected HTTP getter).
- `functions/_lib/google-business-overview-core.test.ts`
- `src/components/GmbDailyChart.jsx`
- `src/components/GmbSearchTermsTable.jsx`
- `src/components/GmbReviewsBlock.jsx`
- `src/components/GmbByLocationTable.jsx`

**Modify:**
- `src/lib/platformOverviewUrl.js` — add `filters.locationId` → `location_id` param.
- `src/lib/platformOverviewUrl.test.js` — add case.
- `functions/api/admin/platform/google-business-overview.ts` — rewrite handler to use core + auth branches.
- `src/pages/GoogleMeuNegocio.jsx` — rewrite to Provider + real blocks.

---

### Task 1: `location_id` param in `buildPlatformOverviewUrl`

**Files:**
- Modify: `src/lib/platformOverviewUrl.js`
- Test: `src/lib/platformOverviewUrl.test.js`

**Interfaces:**
- Produces: `buildPlatformOverviewUrl(endpoint, { filters: { locationId } })` appends `location_id=<id>`.

- [ ] **Step 1: Write the failing test** — append to `src/lib/platformOverviewUrl.test.js`:

```js
it('inclui location_id quando filters.locationId é passado', () => {
  const url = buildPlatformOverviewUrl('/api/x', {
    orgId: 'org1',
    dateRange: { start: new Date('2026-06-01'), end: new Date('2026-06-30') },
    filters: { locationId: '123' },
  })
  expect(url).toContain('location_id=123')
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/lib/platformOverviewUrl.test.js`
Expected: FAIL (location_id not in URL).

- [ ] **Step 3: Implement** — in `src/lib/platformOverviewUrl.js`, after the `if (f.adId)` line (~line 52) add:

```js
  if (f.locationId) p.set('location_id', String(f.locationId))
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/lib/platformOverviewUrl.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/platformOverviewUrl.js src/lib/platformOverviewUrl.test.js
git commit -m "feat(gbp): support location_id in platform overview url"
```

---

### Task 2: Performance daily metrics lib

**Files:**
- Create: `functions/_lib/google-business-performance.ts`
- Test: `functions/_lib/google-business-performance.test.ts`

**Interfaces:**
- Produces:
  - `type PerfTotals = { views, viewsMaps, viewsSearch, calls, website, directions, conversations }` (all `number`)
  - `type PerfDaily = { date: string } & PerfTotals`
  - `type PerformancePayload = { daily: PerfDaily[]; totals: PerfTotals; error: string | null }`
  - `parsePerformanceResponse(body: unknown, since: string, until: string): PerformancePayload`
  - `fetchPerformanceDaily(httpGet: HttpGet, locationId: string, since: string, until: string): Promise<PerformancePayload>`
  - `type HttpGet = (url: string) => Promise<{ ok: boolean; status: number; json: unknown }>`

- [ ] **Step 1: Write the failing test** — `functions/_lib/google-business-performance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parsePerformanceResponse, fetchPerformanceDaily } from './google-business-performance'

function metricSeries(metric: string, values: Array<[string, number]>) {
  return {
    dailyMetricTimeSeries: [
      {
        dailyMetric: metric,
        timeSeries: {
          datedValues: values.map(([d, v]) => {
            const [year, month, day] = d.split('-').map(Number)
            return { date: { year, month, day }, value: String(v) }
          }),
        },
      },
    ],
  }
}

const sampleBody = {
  multiDailyMetricTimeSeries: [
    metricSeries('BUSINESS_IMPRESSIONS_DESKTOP_MAPS', [['2026-06-01', 10], ['2026-06-02', 5]]),
    metricSeries('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', [['2026-06-01', 20], ['2026-06-02', 7]]),
    metricSeries('CALL_CLICKS', [['2026-06-01', 3]]),
    metricSeries('WEBSITE_CLICKS', [['2026-06-02', 4]]),
  ],
}

describe('parsePerformanceResponse', () => {
  it('agrega impressões em views e separa Maps/Busca, preenche gaps', () => {
    const p = parsePerformanceResponse(sampleBody, '2026-06-01', '2026-06-02')
    expect(p.error).toBeNull()
    expect(p.daily).toHaveLength(2)
    const d1 = p.daily.find((d) => d.date === '2026-06-01')!
    expect(d1.viewsMaps).toBe(10)
    expect(d1.viewsSearch).toBe(20)
    expect(d1.views).toBe(30)
    expect(d1.calls).toBe(3)
    const d2 = p.daily.find((d) => d.date === '2026-06-02')!
    expect(d2.website).toBe(4)
    expect(d2.calls).toBe(0) // gap preenchido
    expect(p.totals.views).toBe(42) // 10+20 + 5+7
    expect(p.totals.calls).toBe(3)
    expect(p.totals.website).toBe(4)
  })

  it('corpo vazio devolve totais zerados sem erro', () => {
    const p = parsePerformanceResponse({}, '2026-06-01', '2026-06-01')
    expect(p.error).toBeNull()
    expect(p.totals.views).toBe(0)
    expect(p.daily).toHaveLength(1)
  })
})

describe('fetchPerformanceDaily', () => {
  it('monta URL com dailyMetrics e dailyRange e parseia', async () => {
    let calledUrl = ''
    const httpGet = async (url: string) => {
      calledUrl = url
      return { ok: true, status: 200, json: sampleBody }
    }
    const p = await fetchPerformanceDaily(httpGet, '123', '2026-06-01', '2026-06-02')
    expect(calledUrl).toContain('locations/123:fetchMultiDailyMetricsTimeSeries')
    expect(calledUrl).toContain('dailyMetrics=CALL_CLICKS')
    expect(calledUrl).toContain('dailyRange.startDate.year=2026')
    expect(calledUrl).toContain('dailyRange.endDate.day=2')
    expect(p.totals.views).toBe(42)
  })

  it('HTTP não-ok vira error e totais zerados', async () => {
    const httpGet = async () => ({ ok: false, status: 403, json: { error: { message: 'denied' } } })
    const p = await fetchPerformanceDaily(httpGet, '123', '2026-06-01', '2026-06-02')
    expect(p.error).toContain('denied')
    expect(p.totals.views).toBe(0)
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run functions/_lib/google-business-performance.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `functions/_lib/google-business-performance.ts`:

```ts
/** Métricas diárias do Business Profile Performance API (views, ligações, site, rotas, conversas). */

export type HttpGet = (url: string) => Promise<{ ok: boolean; status: number; json: unknown }>

export type PerfTotals = {
  views: number
  viewsMaps: number
  viewsSearch: number
  calls: number
  website: number
  directions: number
  conversations: number
}

export type PerfDaily = { date: string } & PerfTotals

export type PerformancePayload = {
  daily: PerfDaily[]
  totals: PerfTotals
  error: string | null
}

const PERF_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_CONVERSATIONS',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function dateToYmd(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const o = d as { year?: number; month?: number; day?: number }
  if (!o.year || !o.month || !o.day) return null
  return `${o.year}-${pad2(o.month)}-${pad2(o.day)}`
}

function ymdParts(s: string): { year: number; month: number; day: number } {
  const [year, month, day] = s.split('-').map((x) => Number.parseInt(x, 10))
  return { year, month, day }
}

function emptyTotals(): PerfTotals {
  return { views: 0, viewsMaps: 0, viewsSearch: 0, calls: 0, website: 0, directions: 0, conversations: 0 }
}

function ymdAddOne(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function parsePerformanceResponse(body: unknown, since: string, until: string): PerformancePayload {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const multi = Array.isArray(root.multiDailyMetricTimeSeries) ? root.multiDailyMetricTimeSeries : []

  // metric -> (date -> value)
  const byMetric = new Map<string, Map<string, number>>()
  for (const block of multi) {
    const dmts = (block as Record<string, unknown>)?.dailyMetricTimeSeries
    if (!Array.isArray(dmts)) continue
    for (const dm of dmts) {
      const o = dm as Record<string, unknown>
      const metric = typeof o.dailyMetric === 'string' ? o.dailyMetric : ''
      if (!metric) continue
      const ts = (o.timeSeries as Record<string, unknown>)?.datedValues
      const map = byMetric.get(metric) ?? new Map<string, number>()
      if (Array.isArray(ts)) {
        for (const dv of ts) {
          const dvo = dv as Record<string, unknown>
          const ymd = dateToYmd(dvo.date)
          if (!ymd) continue
          const value = Number.parseInt(String(dvo.value ?? '0'), 10) || 0
          map.set(ymd, (map.get(ymd) ?? 0) + value)
        }
      }
      byMetric.set(metric, map)
    }
  }

  const get = (metric: string, ymd: string) => byMetric.get(metric)?.get(ymd) ?? 0

  const daily: PerfDaily[] = []
  const totals = emptyTotals()
  let guard = 0
  for (let d = since; d <= until && guard < 800; d = ymdAddOne(d), guard++) {
    const viewsMaps = get('BUSINESS_IMPRESSIONS_DESKTOP_MAPS', d) + get('BUSINESS_IMPRESSIONS_MOBILE_MAPS', d)
    const viewsSearch = get('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', d) + get('BUSINESS_IMPRESSIONS_MOBILE_SEARCH', d)
    const calls = get('CALL_CLICKS', d)
    const website = get('WEBSITE_CLICKS', d)
    const directions = get('BUSINESS_DIRECTION_REQUESTS', d)
    const conversations = get('BUSINESS_CONVERSATIONS', d)
    const views = viewsMaps + viewsSearch
    daily.push({ date: d, views, viewsMaps, viewsSearch, calls, website, directions, conversations })
    totals.views += views
    totals.viewsMaps += viewsMaps
    totals.viewsSearch += viewsSearch
    totals.calls += calls
    totals.website += website
    totals.directions += directions
    totals.conversations += conversations
  }

  return { daily, totals, error: null }
}

export async function fetchPerformanceDaily(
  httpGet: HttpGet,
  locationId: string,
  since: string,
  until: string
): Promise<PerformancePayload> {
  const u = new URL(
    `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`
  )
  for (const m of PERF_METRICS) u.searchParams.append('dailyMetrics', m)
  const s = ymdParts(since)
  const e = ymdParts(until)
  u.searchParams.set('dailyRange.startDate.year', String(s.year))
  u.searchParams.set('dailyRange.startDate.month', String(s.month))
  u.searchParams.set('dailyRange.startDate.day', String(s.day))
  u.searchParams.set('dailyRange.endDate.year', String(e.year))
  u.searchParams.set('dailyRange.endDate.month', String(e.month))
  u.searchParams.set('dailyRange.endDate.day', String(e.day))

  const res = await httpGet(u.toString())
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { daily: [], totals: emptyTotals(), error: j?.error?.message || `Performance API (${res.status})` }
  }
  return parsePerformanceResponse(res.json, since, until)
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run functions/_lib/google-business-performance.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-business-performance.ts functions/_lib/google-business-performance.test.ts
git commit -m "feat(gbp): performance daily metrics lib"
```

---

### Task 3: Search keywords lib

**Files:**
- Create: `functions/_lib/google-business-keywords.ts`
- Test: `functions/_lib/google-business-keywords.test.ts`

**Interfaces:**
- Consumes: `HttpGet` from `./google-business-performance`.
- Produces:
  - `type KeywordItem = { keyword: string; impressions: number; approximate: boolean }`
  - `type KeywordsPayload = { items: KeywordItem[]; monthsCovered: string | null; error: string | null }`
  - `parseSearchKeywords(body: unknown): KeywordItem[]`
  - `fetchSearchKeywords(httpGet, locationId, since, until): Promise<KeywordsPayload>`

- [ ] **Step 1: Write the failing test** — `functions/_lib/google-business-keywords.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseSearchKeywords, fetchSearchKeywords } from './google-business-keywords'

const body = {
  searchKeywordsCounts: [
    { searchKeyword: 'consultoria financeira', insightsValue: { value: '1240' } },
    { searchKeyword: 'p12', insightsValue: { threshold: '15' } },
    { searchKeyword: 'planejamento', insightsValue: { value: '300' } },
  ],
}

describe('parseSearchKeywords', () => {
  it('ordena por impressões desc e marca threshold como aproximado', () => {
    const items = parseSearchKeywords(body)
    expect(items.map((i) => i.keyword)).toEqual(['consultoria financeira', 'planejamento', 'p12'])
    expect(items[0].approximate).toBe(false)
    const p12 = items.find((i) => i.keyword === 'p12')!
    expect(p12.impressions).toBe(15)
    expect(p12.approximate).toBe(true)
  })
})

describe('fetchSearchKeywords', () => {
  it('monta monthlyRange e parseia', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchSearchKeywords(httpGet, '123', '2026-05-10', '2026-06-20')
    expect(url).toContain('locations/123/searchkeywords/impressions/monthly')
    expect(url).toContain('monthlyRange.startMonth.year=2026')
    expect(url).toContain('monthlyRange.startMonth.month=5')
    expect(url).toContain('monthlyRange.endMonth.month=6')
    expect(p.items).toHaveLength(3)
    expect(p.monthsCovered).toBe('2026-05 a 2026-06')
  })

  it('erro HTTP vira payload com error', async () => {
    const httpGet = async () => ({ ok: false, status: 400, json: { error: { message: 'bad' } } })
    const p = await fetchSearchKeywords(httpGet, '123', '2026-05-10', '2026-06-20')
    expect(p.error).toContain('bad')
    expect(p.items).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run functions/_lib/google-business-keywords.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `functions/_lib/google-business-keywords.ts`:

```ts
/** Termos de busca (searchkeywords impressions monthly) do Business Profile Performance API. */
import type { HttpGet } from './google-business-performance'

export type KeywordItem = { keyword: string; impressions: number; approximate: boolean }
export type KeywordsPayload = { items: KeywordItem[]; monthsCovered: string | null; error: string | null }

export function parseSearchKeywords(body: unknown): KeywordItem[] {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const counts = Array.isArray(root.searchKeywordsCounts) ? root.searchKeywordsCounts : []
  const items: KeywordItem[] = []
  for (const c of counts) {
    const o = c as Record<string, unknown>
    const keyword = typeof o.searchKeyword === 'string' && o.searchKeyword.trim() ? o.searchKeyword.trim() : '—'
    const iv = (o.insightsValue ?? {}) as Record<string, unknown>
    const hasValue = iv.value != null
    const raw = hasValue ? iv.value : iv.threshold
    const impressions = Number.parseInt(String(raw ?? '0'), 10) || 0
    items.push({ keyword, impressions, approximate: !hasValue })
  }
  items.sort((a, b) => b.impressions - a.impressions)
  return items
}

export async function fetchSearchKeywords(
  httpGet: HttpGet,
  locationId: string,
  since: string,
  until: string
): Promise<KeywordsPayload> {
  const [sy, sm] = since.split('-').map((x) => Number.parseInt(x, 10))
  const [ey, em] = until.split('-').map((x) => Number.parseInt(x, 10))
  const u = new URL(
    `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}/searchkeywords/impressions/monthly`
  )
  u.searchParams.set('monthlyRange.startMonth.year', String(sy))
  u.searchParams.set('monthlyRange.startMonth.month', String(sm))
  u.searchParams.set('monthlyRange.endMonth.year', String(ey))
  u.searchParams.set('monthlyRange.endMonth.month', String(em))

  const monthsCovered = `${sy}-${String(sm).padStart(2, '0')} a ${ey}-${String(em).padStart(2, '0')}`
  const res = await httpGet(u.toString())
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { items: [], monthsCovered, error: j?.error?.message || `Search keywords API (${res.status})` }
  }
  return { items: parseSearchKeywords(res.json), monthsCovered, error: null }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run functions/_lib/google-business-keywords.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-business-keywords.ts functions/_lib/google-business-keywords.test.ts
git commit -m "feat(gbp): search keywords lib"
```

---

### Task 4: Reviews lib

**Files:**
- Create: `functions/_lib/google-business-reviews.ts`
- Test: `functions/_lib/google-business-reviews.test.ts`

**Interfaces:**
- Consumes: `HttpGet` from `./google-business-performance`.
- Produces:
  - `type ReviewItem = { id: string; author: string; rating: number; comment: string; date: string | null }`
  - `type ReviewsPayload = { items: ReviewItem[]; averageRating: number | null; totalCount: number | null; distribution: Record<'1'|'2'|'3'|'4'|'5', number>; error: string | null }`
  - `parseReviews(body: unknown): ReviewsPayload`
  - `fetchReviews(httpGet, accountId, locationId): Promise<ReviewsPayload>`

- [ ] **Step 1: Write the failing test** — `functions/_lib/google-business-reviews.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseReviews, fetchReviews } from './google-business-reviews'

const body = {
  reviews: [
    { reviewId: 'r1', reviewer: { displayName: 'Maria' }, starRating: 'FIVE', comment: 'Ótimo', updateTime: '2026-06-10T00:00:00Z' },
    { reviewId: 'r2', reviewer: { displayName: 'João' }, starRating: 'FOUR', comment: 'Bom', updateTime: '2026-06-09T00:00:00Z' },
    { reviewId: 'r3', reviewer: {}, starRating: 'FIVE' },
  ],
  averageRating: 4.7,
  totalReviewCount: 148,
}

describe('parseReviews', () => {
  it('mapeia starRating enum->número, distribuição e fallback de autor', () => {
    const p = parseReviews(body)
    expect(p.items).toHaveLength(3)
    expect(p.items[0].rating).toBe(5)
    expect(p.items[2].author).toBe('Anônimo')
    expect(p.averageRating).toBe(4.7)
    expect(p.totalCount).toBe(148)
    expect(p.distribution['5']).toBe(2)
    expect(p.distribution['4']).toBe(1)
  })
})

describe('fetchReviews', () => {
  it('chama v4 com account+location e parseia', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchReviews(httpGet, 'acc1', 'loc1')
    expect(url).toContain('mybusiness.googleapis.com/v4/accounts/acc1/locations/loc1/reviews')
    expect(p.totalCount).toBe(148)
  })

  it('403 vira error sem quebrar', async () => {
    const httpGet = async () => ({ ok: false, status: 403, json: { error: { message: 'not allowlisted' } } })
    const p = await fetchReviews(httpGet, 'acc1', 'loc1')
    expect(p.error).toContain('not allowlisted')
    expect(p.items).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run functions/_lib/google-business-reviews.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `functions/_lib/google-business-reviews.ts`:

```ts
/** Reviews do Google Business via My Business API v4 (legada, requer allowlist). */
import type { HttpGet } from './google-business-performance'

export type ReviewItem = { id: string; author: string; rating: number; comment: string; date: string | null }
export type ReviewsPayload = {
  items: ReviewItem[]
  averageRating: number | null
  totalCount: number | null
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
  error: string | null
}

const STAR: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

function emptyDistribution(): Record<'1' | '2' | '3' | '4' | '5', number> {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
}

export function parseReviews(body: unknown): ReviewsPayload {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const reviews = Array.isArray(root.reviews) ? root.reviews : []
  const distribution = emptyDistribution()
  const items: ReviewItem[] = []
  for (const r of reviews) {
    const o = r as Record<string, unknown>
    const reviewer = (o.reviewer ?? {}) as Record<string, unknown>
    const rating = STAR[String(o.starRating ?? '')] ?? 0
    const item: ReviewItem = {
      id: String(o.reviewId ?? o.name ?? `${items.length}`),
      author: typeof reviewer.displayName === 'string' && reviewer.displayName.trim() ? reviewer.displayName.trim() : 'Anônimo',
      rating,
      comment: typeof o.comment === 'string' ? o.comment : '',
      date: typeof o.updateTime === 'string' ? o.updateTime : typeof o.createTime === 'string' ? o.createTime : null,
    }
    items.push(item)
    if (rating >= 1 && rating <= 5) {
      distribution[String(rating) as '1' | '2' | '3' | '4' | '5']++
    }
  }
  const avg = typeof root.averageRating === 'number' ? root.averageRating : null
  const total = typeof root.totalReviewCount === 'number' ? root.totalReviewCount : null
  return { items, averageRating: avg, totalCount: total, distribution, error: null }
}

export async function fetchReviews(httpGet: HttpGet, accountId: string, locationId: string): Promise<ReviewsPayload> {
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=updateTime%20desc`
  const res = await httpGet(url)
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return {
      items: [],
      averageRating: null,
      totalCount: null,
      distribution: emptyDistribution(),
      error: j?.error?.message || `Reviews API (${res.status})`,
    }
  }
  return parseReviews(res.json)
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run functions/_lib/google-business-reviews.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-business-reviews.ts functions/_lib/google-business-reviews.test.ts
git commit -m "feat(gbp): reviews lib (My Business v4)"
```

---

### Task 5: Locations lib

**Files:**
- Create: `functions/_lib/google-business-locations.ts`
- Test: folded into Task 6's core test (locations parsing exercised via the overview core). A standalone test is added here too.
- Test: `functions/_lib/google-business-locations.test.ts`

**Interfaces:**
- Consumes: `HttpGet` from `./google-business-performance`.
- Produces:
  - `type BusinessLocation = { id: string; label: string; address: string | null }`
  - `parseLocations(body: unknown): BusinessLocation[]`
  - `fetchLocations(httpGet, accountId): Promise<{ items: BusinessLocation[]; error: string | null }>`

- [ ] **Step 1: Write the failing test** — `functions/_lib/google-business-locations.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseLocations, fetchLocations } from './google-business-locations'

const body = {
  locations: [
    { name: 'locations/111', title: 'P12 Centro', storefrontAddress: { locality: 'São Paulo', administrativeArea: 'SP' } },
    { name: 'locations/222', title: 'P12 Zona Sul', storefrontAddress: { locality: 'São Paulo' } },
  ],
}

describe('parseLocations', () => {
  it('extrai id, label e endereço', () => {
    const items = parseLocations(body)
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ id: '111', label: 'P12 Centro', address: 'São Paulo, SP' })
    expect(items[1].address).toBe('São Paulo')
  })
})

describe('fetchLocations', () => {
  it('chama Business Information API com readMask', async () => {
    let url = ''
    const httpGet = async (u: string) => {
      url = u
      return { ok: true, status: 200, json: body }
    }
    const p = await fetchLocations(httpGet, 'acc1')
    expect(url).toContain('mybusinessbusinessinformation.googleapis.com/v1/accounts/acc1/locations')
    expect(url).toContain('readMask=')
    expect(p.items).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run functions/_lib/google-business-locations.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `functions/_lib/google-business-locations.ts`:

```ts
/** Lista de locais (Business Information API). */
import type { HttpGet } from './google-business-performance'

export type BusinessLocation = { id: string; label: string; address: string | null }

export function parseLocations(body: unknown): BusinessLocation[] {
  const root = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const locs = Array.isArray(root.locations) ? root.locations : []
  const out: BusinessLocation[] = []
  for (const l of locs) {
    const o = l as Record<string, unknown>
    const id = String(o.name ?? '').replace(/^locations\//, '').trim()
    if (!id) continue
    const addr = (o.storefrontAddress ?? {}) as Record<string, unknown>
    const address =
      [addr.locality, addr.administrativeArea].filter((x) => typeof x === 'string' && x).join(', ') || null
    out.push({
      id,
      label: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : `Local ${id}`,
      address,
    })
  }
  return out
}

export async function fetchLocations(
  httpGet: HttpGet,
  accountId: string
): Promise<{ items: BusinessLocation[]; error: string | null }> {
  const url =
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations` +
    `?readMask=name,title,storefrontAddress&pageSize=100`
  const res = await httpGet(url)
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { items: [], error: j?.error?.message || `Locations API (${res.status})` }
  }
  return { items: parseLocations(res.json), error: null }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run functions/_lib/google-business-locations.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-business-locations.ts functions/_lib/google-business-locations.test.ts
git commit -m "feat(gbp): locations lib"
```

---

### Task 6: Overview core (payload assembly)

**Files:**
- Create: `functions/_lib/google-business-overview-core.ts`
- Test: `functions/_lib/google-business-overview-core.test.ts`

**Interfaces:**
- Consumes: `HttpGet`, `fetchPerformanceDaily`, `fetchSearchKeywords`, `fetchReviews`, `fetchLocations`, `parseLocations`.
- Produces:
  - `type GbpMetric = { label: string; value: string; deltaPct: number | null }`
  - `type BusinessOverviewSections = { locations, selectedLocationId, metrics, compareMetrics, daily, searchKeywords, reviews, byLocation }`
  - `buildBusinessOverviewSections(httpGet, accountId, opts): Promise<BusinessOverviewSections>` where `opts = { locationId?: string|null; since; until; compareSince?: string|null; compareUntil?: string|null }`
  - `MAX_BYLOCATION = 25`

- [ ] **Step 1: Write the failing test** — `functions/_lib/google-business-overview-core.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildBusinessOverviewSections } from './google-business-overview-core'

function perfBody(calls: number) {
  return {
    multiDailyMetricTimeSeries: [
      {
        dailyMetricTimeSeries: [
          { dailyMetric: 'CALL_CLICKS', timeSeries: { datedValues: [{ date: { year: 2026, month: 6, day: 1 }, value: String(calls) }] } },
          { dailyMetric: 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', timeSeries: { datedValues: [{ date: { year: 2026, month: 6, day: 1 }, value: '100' }] } },
        ],
      },
    ],
  }
}

const locationsBody = {
  locations: [
    { name: 'locations/111', title: 'Centro' },
    { name: 'locations/222', title: 'Zona Sul' },
  ],
}

function router(url: string) {
  if (url.includes('/locations') && url.includes('readMask')) return { ok: true, status: 200, json: locationsBody }
  if (url.includes(':fetchMultiDailyMetricsTimeSeries')) return { ok: true, status: 200, json: perfBody(5) }
  if (url.includes('searchkeywords')) return { ok: true, status: 200, json: { searchKeywordsCounts: [{ searchKeyword: 'x', insightsValue: { value: '9' } }] } }
  if (url.includes('/reviews')) return { ok: true, status: 200, json: { reviews: [], averageRating: 4.5, totalReviewCount: 3 } }
  return { ok: false, status: 404, json: { error: { message: 'no route' } } }
}

describe('buildBusinessOverviewSections', () => {
  it('monta seções e seleciona primeiro local quando não há location_id', async () => {
    const httpGet = async (u: string) => router(u)
    const s = await buildBusinessOverviewSections(httpGet, 'acc1', { since: '2026-06-01', until: '2026-06-01' })
    expect(s.locations).toHaveLength(2)
    expect(s.selectedLocationId).toBe('111')
    expect(s.metrics.find((m) => m.label === 'Ligações')?.value).toBe('5')
    expect(s.metrics.find((m) => m.label === 'Visualizações')?.value).toBe('100')
    expect(s.searchKeywords.items).toHaveLength(1)
    expect(s.reviews.totalCount).toBe(3)
    expect(s.byLocation.items.length).toBe(2)
  })

  it('respeita location_id selecionado e calcula deltaPct com comparação', async () => {
    let perfCallCount = 0
    const httpGet = async (u: string) => {
      if (u.includes(':fetchMultiDailyMetricsTimeSeries')) {
        perfCallCount++
        // primeira chamada (selecionado, período) calls=10; comparação calls=5
        const isCompare = u.includes('dailyRange.startDate.month=5')
        return { ok: true, status: 200, json: perfBody(isCompare ? 5 : 10) }
      }
      return router(u)
    }
    const s = await buildBusinessOverviewSections(httpGet, 'acc1', {
      locationId: '222',
      since: '2026-06-01',
      until: '2026-06-01',
      compareSince: '2026-05-01',
      compareUntil: '2026-05-01',
    })
    expect(s.selectedLocationId).toBe('222')
    const calls = s.metrics.find((m) => m.label === 'Ligações')!
    expect(calls.value).toBe('10')
    expect(calls.deltaPct).toBe(100) // (10-5)/5
    expect(perfCallCount).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run functions/_lib/google-business-overview-core.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `functions/_lib/google-business-overview-core.ts`:

```ts
import type { HttpGet, PerfTotals } from './google-business-performance'
import { fetchPerformanceDaily } from './google-business-performance'
import { fetchSearchKeywords, type KeywordsPayload } from './google-business-keywords'
import { fetchReviews, type ReviewsPayload } from './google-business-reviews'
import { fetchLocations, type BusinessLocation } from './google-business-locations'

export const MAX_BYLOCATION = 25

export type GbpMetric = { label: string; value: string; deltaPct: number | null }

export type ByLocationItem = {
  id: string
  label: string
  views: number
  calls: number
  website: number
  directions: number
}

export type BusinessOverviewSections = {
  locations: BusinessLocation[]
  selectedLocationId: string | null
  metrics: GbpMetric[]
  compareMetrics: GbpMetric[] | null
  daily: Awaited<ReturnType<typeof fetchPerformanceDaily>>['daily']
  searchKeywords: KeywordsPayload
  reviews: ReviewsPayload
  byLocation: { items: ByLocationItem[]; error: string | null }
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(n))
}

function deltaPct(primary: number, compare: number): number | null {
  if (compare === 0) return primary === 0 ? 0 : null
  return ((primary - compare) / compare) * 100
}

function buildMetrics(t: PerfTotals, c: PerfTotals | null): GbpMetric[] {
  const d = (p: number, cv: number) => (c ? deltaPct(p, cv) : null)
  return [
    { label: 'Visualizações', value: fmtInt(t.views), deltaPct: c ? d(t.views, c.views) : null },
    { label: 'Ligações', value: fmtInt(t.calls), deltaPct: c ? d(t.calls, c.calls) : null },
    { label: 'Cliques no site', value: fmtInt(t.website), deltaPct: c ? d(t.website, c.website) : null },
    { label: 'Rotas', value: fmtInt(t.directions), deltaPct: c ? d(t.directions, c.directions) : null },
    { label: 'Conversas', value: fmtInt(t.conversations), deltaPct: c ? d(t.conversations, c.conversations) : null },
  ]
}

export async function buildBusinessOverviewSections(
  httpGet: HttpGet,
  accountId: string,
  opts: {
    locationId?: string | null
    since: string
    until: string
    compareSince?: string | null
    compareUntil?: string | null
  }
): Promise<BusinessOverviewSections> {
  const locRes = await fetchLocations(httpGet, accountId)
  const locations = locRes.items
  const selected =
    (opts.locationId && locations.find((l) => l.id === opts.locationId)) || locations[0] || null
  const selectedLocationId = selected?.id ?? null

  if (!selectedLocationId) {
    return {
      locations,
      selectedLocationId: null,
      metrics: [],
      compareMetrics: null,
      daily: [],
      searchKeywords: { items: [], monthsCovered: null, error: locRes.error },
      reviews: { items: [], averageRating: null, totalCount: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }, error: locRes.error },
      byLocation: { items: [], error: locRes.error },
    }
  }

  const [perf, keywords, reviews] = await Promise.all([
    fetchPerformanceDaily(httpGet, selectedLocationId, opts.since, opts.until),
    fetchSearchKeywords(httpGet, selectedLocationId, opts.since, opts.until),
    fetchReviews(httpGet, accountId, selectedLocationId),
  ])

  let compareTotals: PerfTotals | null = null
  if (opts.compareSince && opts.compareUntil) {
    const cmp = await fetchPerformanceDaily(httpGet, selectedLocationId, opts.compareSince, opts.compareUntil)
    compareTotals = cmp.error ? null : cmp.totals
  }

  // byLocation: KPIs de cada local (capado)
  const byLocItems: ByLocationItem[] = []
  let byLocError: string | null = null
  if (locations.length > 1) {
    const capped = locations.slice(0, MAX_BYLOCATION)
    const results = await Promise.all(
      capped.map((l) => fetchPerformanceDaily(httpGet, l.id, opts.since, opts.until))
    )
    results.forEach((r, i) => {
      if (r.error) {
        byLocError = byLocError || r.error
        return
      }
      byLocItems.push({
        id: capped[i].id,
        label: capped[i].label,
        views: r.totals.views,
        calls: r.totals.calls,
        website: r.totals.website,
        directions: r.totals.directions,
      })
    })
    byLocItems.sort((a, b) => b.views - a.views)
  }

  return {
    locations,
    selectedLocationId,
    metrics: buildMetrics(perf.totals, compareTotals),
    compareMetrics: compareTotals ? buildMetrics(compareTotals, null) : null,
    daily: perf.daily,
    searchKeywords: keywords,
    reviews,
    byLocation: { items: byLocItems, error: byLocError },
  }
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run functions/_lib/google-business-overview-core.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/google-business-overview-core.ts functions/_lib/google-business-overview-core.test.ts
git commit -m "feat(gbp): overview core payload assembly"
```

---

### Task 7: Rewrite overview handler

**Files:**
- Modify: `functions/api/admin/platform/google-business-overview.ts` (full rewrite)

**Interfaces:**
- Consumes: `buildBusinessOverviewSections`, existing auth helpers (`getActiveConnectionForOrg`, `getValidGoogleAccessTokenFromCredential`, `getGoogleAccessTokenFromEnv`, `userCanAccessOrg`, `requireSuperAdmin`).
- Produces: HTTP JSON payload `{ configured, source, accountDisplay, error, detail, primaryRange, compareRange, ...sections }` consumed by the frontend.

- [ ] **Step 1: Write the handler** — replace entire `functions/api/admin/platform/google-business-overview.ts`:

```ts
import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json, jsonError } from '../../../_lib/json'
import { getGoogleAccessTokenFromEnv } from '../../../_lib/google-access-token'
import {
  getActiveConnectionForOrg,
  getValidGoogleAccessTokenFromCredential,
} from '../../../_lib/org-platform-credentials'
import type { HttpGet } from '../../../_lib/google-business-performance'
import { buildBusinessOverviewSections } from '../../../_lib/google-business-overview-core'

function normalizeGmbAccountKey(raw: string): string {
  return raw.trim().replace(/^accounts\//, '')
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function defaultLast30(): { since: string; until: string } {
  const u = new Date()
  // Performance API tem atraso ~3 dias; encerra a janela 3 dias atrás.
  u.setUTCDate(u.getUTCDate() - 3)
  const until = u.toISOString().slice(0, 10)
  const s = new Date(u)
  s.setUTCDate(s.getUTCDate() - 29)
  return { since: s.toISOString().slice(0, 10), until }
}

function parseRange(url: URL): { since: string; until: string; compareSince: string | null; compareUntil: string | null } {
  const ds = url.searchParams.get('since')?.trim() ?? ''
  const du = url.searchParams.get('until')?.trim() ?? ''
  let since = isYmd(ds) ? ds : ''
  let until = isYmd(du) ? du : ''
  if (!since || !until) {
    const d = defaultLast30()
    since = d.since
    until = d.until
  }
  const cs = url.searchParams.get('compare_since')?.trim() ?? ''
  const ct = url.searchParams.get('compare_until')?.trim() ?? ''
  return {
    since,
    until,
    compareSince: isYmd(cs) ? cs : null,
    compareUntil: isYmd(ct) ? ct : null,
  }
}

function emptySections() {
  return {
    locations: [],
    selectedLocationId: null,
    metrics: [],
    compareMetrics: null,
    daily: [],
    searchKeywords: { items: [], monthsCovered: null, error: null },
    reviews: { items: [], averageRating: null, totalCount: null, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }, error: null },
    byLocation: { items: [], error: null },
  }
}

function makeHttpGet(access: string): HttpGet {
  return async (url: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } })
    const j = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, json: j }
  }
}

async function pickAccountId(
  httpGet: HttpGet,
  preferredExternalId: string | null
): Promise<{ accountId: string | null; accountDisplay: string | null; error: string | null }> {
  const res = await httpGet('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')
  if (!res.ok) {
    const j = res.json as { error?: { message?: string } }
    return { accountId: null, accountDisplay: null, error: j?.error?.message || `Account API (${res.status})` }
  }
  const body = res.json as { accounts?: { name?: string; accountName?: string }[] }
  let accounts = body.accounts ?? []
  if (preferredExternalId?.trim()) {
    const want = normalizeGmbAccountKey(preferredExternalId)
    const filtered = accounts.filter((a) => normalizeGmbAccountKey(a.name ?? '') === want || (a.name ?? '').includes(want))
    if (filtered.length) accounts = filtered
  }
  const primary = accounts[0]
  if (!primary) return { accountId: null, accountDisplay: null, error: 'Nenhuma conta Google Business encontrada.' }
  return {
    accountId: normalizeGmbAccountKey(primary.name ?? ''),
    accountDisplay: primary.accountName?.trim() || normalizeGmbAccountKey(primary.name ?? '') || null,
    error: null,
  }
}

async function buildBody(
  access: string,
  source: 'worker_env' | 'oauth_org' | 'assigned_env',
  preferredExternalId: string | null,
  fallbackDisplay: string | null,
  locationId: string | null,
  range: ReturnType<typeof parseRange>
): Promise<Record<string, unknown>> {
  const httpGet = makeHttpGet(access)
  const acc = await pickAccountId(httpGet, preferredExternalId)
  if (!acc.accountId) {
    return {
      configured: true,
      source,
      accountDisplay: fallbackDisplay,
      error: acc.error,
      detail: null,
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    }
  }

  const sections = await buildBusinessOverviewSections(httpGet, acc.accountId, {
    locationId,
    since: range.since,
    until: range.until,
    compareSince: range.compareSince,
    compareUntil: range.compareUntil,
  })

  return {
    configured: true,
    source,
    accountDisplay: acc.accountDisplay || fallbackDisplay,
    error: null,
    detail: `Conta ${acc.accountId} · ${range.since} → ${range.until}`,
    primaryRange: { since: range.since, until: range.until },
    compareRange:
      range.compareSince && range.compareUntil
        ? { since: range.compareSince, until: range.compareUntil }
        : null,
    ...sections,
  }
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim() || ''
  const locationId = url.searchParams.get('location_id')?.trim() || null
  const range = parseRange(url)

  if (orgId) {
    if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
      return jsonError('Sem acesso a esta organização', 403)
    }
    const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'google_business')
    if (!conn) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: null,
        error: null,
        detail: 'Nenhuma conta Google Meu Negócio ligada a esta organização.',
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
    const access = await getValidGoogleAccessTokenFromCredential(
      context.env.DB,
      context.env,
      conn.oauth_credential_id
    )
    if (!access) {
      return json({
        configured: false,
        source: 'oauth_org',
        accountDisplay: conn.external_name,
        error: null,
        detail: 'Token Google indisponível. Reconecte em Integrações.',
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
    try {
      const body = await buildBody(
        access,
        'oauth_org',
        conn.external_id,
        conn.external_name?.trim() || null,
        locationId,
        range
      )
      return json(body)
    } catch (e) {
      return json({
        configured: true,
        source: 'oauth_org',
        accountDisplay: conn.external_name ?? null,
        error: e instanceof Error ? e.message : 'Erro Google Business',
        detail: null,
        primaryRange: { since: range.since, until: range.until },
        compareRange: null,
        ...emptySections(),
      })
    }
  }

  if (user.role !== 'super_admin') {
    return jsonError('org_id é obrigatório', 400)
  }
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const access = await getGoogleAccessTokenFromEnv(context.env)
  if (!access) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null,
      error: null,
      detail: 'Defina GOOGLE_ADS_REFRESH_TOKEN (escopo business.manage) + CLIENT_ID/SECRET no Worker.',
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    })
  }

  try {
    const body = await buildBody(access, 'worker_env', null, null, locationId, range)
    return json(body)
  } catch (e) {
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null,
      error: e instanceof Error ? e.message : 'Erro Google Business',
      detail: null,
      primaryRange: { since: range.since, until: range.until },
      compareRange: null,
      ...emptySections(),
    })
  }
}
```

- [ ] **Step 2: Typecheck/build the functions**

Run: `npx vite build`
Expected: build succeeds (functions typecheck via wrangler is separate; vite build covers the frontend — run it now to ensure no import breakage from later tasks; this task's file is server-only so just ensure no syntax error by running the full test suite next).

- [ ] **Step 3: Run full backend test suite**

Run: `npx vitest run functions/_lib/google-business-overview-core.test.ts functions/_lib/google-business-performance.test.ts functions/_lib/google-business-keywords.test.ts functions/_lib/google-business-reviews.test.ts functions/_lib/google-business-locations.test.ts`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add functions/api/admin/platform/google-business-overview.ts
git commit -m "feat(gbp): rewrite overview handler to return real per-section payload"
```

---

### Task 8: GmbDailyChart component

**Files:**
- Create: `src/components/GmbDailyChart.jsx`

**Interfaces:**
- Consumes: `usePlatformOverview()` → `data.daily` (array of `{ date, views, calls, website, directions, conversations }`).
- Produces: default export `GmbDailyChart`.

- [ ] **Step 1: Implement** — `src/components/GmbDailyChart.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const METRICS = [
  { id: 'views', label: 'Visualizações', color: '#34A853' },
  { id: 'calls', label: 'Ligações', color: '#4285F4' },
  { id: 'website', label: 'Cliques no site', color: '#F5C518' },
  { id: 'directions', label: 'Rotas', color: '#9B8EFF' },
  { id: 'conversations', label: 'Conversas', color: '#FF6B6B' },
]

const LS_KEY = 'p12_gmb_daily_metric'

function readMetric() {
  try {
    const v = localStorage.getItem(LS_KEY)
    if (v && METRICS.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'views'
}

export default function GmbDailyChart() {
  const { loading, data } = usePlatformOverview()
  const [metric, setMetric] = useState(readMetric)
  const def = METRICS.find((m) => m.id === metric) ?? METRICS[0]

  const chartData = useMemo(() => {
    const daily = Array.isArray(data?.daily) ? data.daily : []
    return daily.map((d) => {
      let dia = d.date
      try {
        dia = format(parse(d.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
      } catch {
        /* keep raw */
      }
      return { dia, valor: Number(d[metric]) || 0 }
    })
  }, [data?.daily, metric])

  const onPick = (id) => {
    setMetric(id)
    try {
      localStorage.setItem(LS_KEY, id)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Desempenho diário</span>
        <div className="flex flex-wrap items-center gap-1 rounded-md bg-surface-input p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className={cn(
                'rounded px-2 py-1 font-mono text-[10px] transition-all',
                metric === m.id ? 'bg-brand font-semibold text-[#0F0F0F]' : 'text-muted-foreground hover:text-white'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? <p className="mb-2 text-[10px] text-muted-foreground">Carregando série…</p> : null}
      <div className="min-h-[11rem] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gmbGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={def.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={def.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#666' }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(v) => [formatNumber(Number(v) || 0), def.label]}
              contentStyle={{ background: '#1E1E1E', border: '1px solid #2C2C2C', borderRadius: 8, fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="valor"
              name={def.label}
              stroke={def.color}
              strokeWidth={2}
              fill="url(#gmbGrad)"
              dot={false}
              activeDot={{ r: 3, fill: def.color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify import wiring**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GmbDailyChart.jsx
git commit -m "feat(gbp): daily performance chart component"
```

---

### Task 9: GmbSearchTermsTable component

**Files:**
- Create: `src/components/GmbSearchTermsTable.jsx`

**Interfaces:**
- Consumes: `usePlatformOverview()` → `data.searchKeywords = { items: [{ keyword, impressions, approximate }], monthsCovered, error }`; `usePagedRows`/`TablePagination`.
- Produces: default export `GmbSearchTermsTable`.

- [ ] **Step 1: Implement** — `src/components/GmbSearchTermsTable.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

export default function GmbSearchTermsTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.searchKeywords
  const [desc, setDesc] = useState(true)

  const items = useMemo(() => {
    const list = Array.isArray(payload?.items) ? payload.items : []
    return [...list].sort((a, b) => (desc ? b.impressions - a.impressions : a.impressions - b.impressions))
  }, [payload, desc])

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_terms', defaultSize: 10 })

  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Search size={13} className="text-[#34A853] shrink-0" />
      <span className="section-title">Termos de busca</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={payload?.monthsCovered || undefined}
      state={state}
      emptyMessage="Sem termos de busca no período (perfil pode ter pouco volume)."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <p className="shrink-0 text-[9px] text-muted-foreground font-sans">
        Como as pessoas acharam o perfil. Impressões mensais; “~” = valor aproximado (baixo volume).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 text-left font-semibold">Termo</th>
              <th className="px-2 py-2 text-right font-semibold">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => setDesc((d) => !d)}>
                  Impressões
                  {desc ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t, i) => (
              <tr key={`${t.keyword}-${i}`} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                <td className="max-w-[260px] px-2 py-2 align-top">
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground/70">{rangeStart + i}.</span>
                    <span className="block truncate font-sans text-[11px] text-foreground" title={t.keyword}>
                      {t.keyword}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-foreground">
                  {t.approximate ? '~' : ''}
                  {formatNumber(t.impressions)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        pageSize={pageSize}
        onPageSize={setPageSize}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        className="mt-auto border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GmbSearchTermsTable.jsx
git commit -m "feat(gbp): search terms table component"
```

---

### Task 10: GmbReviewsBlock component

**Files:**
- Create: `src/components/GmbReviewsBlock.jsx`

**Interfaces:**
- Consumes: `usePlatformOverview()` → `data.reviews = { items:[{id,author,rating,comment,date}], averageRating, totalCount, distribution, error }`; `usePagedRows`/`TablePagination`.
- Produces: default export `GmbReviewsBlock`.

- [ ] **Step 1: Implement** — `src/components/GmbReviewsBlock.jsx`:

```jsx
import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

function relativeDate(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const days = Math.round((Date.now() - then) / 86400000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.round(days / 30)
  return months <= 1 ? '1 mês atrás' : `${months} meses atrás`
}

export default function GmbReviewsBlock() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.reviews
  const items = useMemo(() => (Array.isArray(payload?.items) ? payload.items : []), [payload])
  const dist = payload?.distribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  const maxDist = Math.max(1, ...Object.values(dist).map((n) => Number(n) || 0))

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_reviews', defaultSize: 5 })

  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 && payload?.totalCount == null ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <Star size={13} className="text-yellow-400 shrink-0" fill="currentColor" />
      <span className="section-title">Avaliações</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      badge={payload?.averageRating != null ? `${Number(payload.averageRating).toFixed(1)}★ · ${formatNumber(payload?.totalCount || 0)}` : undefined}
      state={state}
      emptyMessage="Sem avaliações para este perfil."
      errorMessage={String(payload?.error || 'Reviews requer My Business API v4 (allowlist).')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-3"
    >
      <div className="flex shrink-0 flex-col gap-1">
        {[5, 4, 3, 2, 1].map((n) => {
          const v = Number(dist[String(n)]) || 0
          return (
            <div key={n} className="flex items-center gap-2">
              <span className="w-3 shrink-0 font-mono text-[10px] text-muted-foreground">{n}</span>
              <Star size={9} className="shrink-0 text-yellow-400" fill="currentColor" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border">
                <div className="h-full rounded-full bg-yellow-400" style={{ width: `${(v / maxDist) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{v}</span>
            </div>
          )
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {pageRows.map((r) => (
          <div key={r.id} className="flex flex-col gap-1.5 border-b border-surface-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-input text-[10px] font-mono text-white">
                  {(r.author || '?')[0]}
                </div>
                <span className="font-sans text-xs font-medium text-white">{r.author}</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: r.rating }, (_, i) => (
                  <Star key={i} size={10} className="text-yellow-400" fill="currentColor" />
                ))}
                <span className="ml-2 font-sans text-[10px] text-muted-foreground">{relativeDate(r.date)}</span>
              </div>
            </div>
            {r.comment ? <p className="font-sans text-[11px] leading-relaxed text-muted-foreground">{r.comment}</p> : null}
          </div>
        ))}
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        pageSize={pageSize}
        onPageSize={setPageSize}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        className="mt-auto border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GmbReviewsBlock.jsx
git commit -m "feat(gbp): reviews block component"
```

---

### Task 11: GmbByLocationTable component

**Files:**
- Create: `src/components/GmbByLocationTable.jsx`

**Interfaces:**
- Consumes: `usePlatformOverview()` → `data.byLocation = { items:[{id,label,views,calls,website,directions}], error }`; `usePagedRows`/`TablePagination`.
- Produces: default export `GmbByLocationTable`. Renders nothing when `items.length <= 1`.

- [ ] **Step 1: Implement** — `src/components/GmbByLocationTable.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, MapPin } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePagedRows, TablePagination } from '@/components/ui/TablePagination'

const COLS = [
  { id: 'label', label: 'Local', align: 'left' },
  { id: 'views', label: 'Visualizações', align: 'right' },
  { id: 'calls', label: 'Ligações', align: 'right' },
  { id: 'website', label: 'Site', align: 'right' },
  { id: 'directions', label: 'Rotas', align: 'right' },
]

export default function GmbByLocationTable() {
  const { loading, data } = usePlatformOverview()
  const payload = data?.byLocation
  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  const [sort, setSort] = useState({ id: 'views', desc: true })

  const items = useMemo(() => {
    const arr = [...rawItems]
    arr.sort((a, b) => {
      const av = a[sort.id]
      const bv = b[sort.id]
      if (sort.id === 'label') return sort.desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv))
      return sort.desc ? (Number(bv) || 0) - (Number(av) || 0) : (Number(av) || 0) - (Number(bv) || 0)
    })
    return arr
  }, [rawItems, sort])

  const { page, setPage, pageSize, setPageSize, totalPages, pageRows, total, rangeStart, rangeEnd } =
    usePagedRows(items, { storageKey: 'p12_pagesize_gmb_locations', defaultSize: 10 })

  if (!loading && rawItems.length <= 1 && !payload?.error) return null

  const onSort = (id) => setSort((p) => (p.id === id ? { id, desc: !p.desc } : { id, desc: true }))
  const state = loading ? 'loading' : payload?.error ? 'error' : items.length === 0 ? 'empty' : 'ready'

  const titleNode = (
    <div className="flex items-center gap-1.5">
      <MapPin size={13} className="text-[#34A853] shrink-0" />
      <span className="section-title">Resultados por local</span>
    </div>
  )

  return (
    <BlockCard
      title={titleNode}
      state={state}
      emptyMessage="Sem dados por local no período."
      errorMessage={String(payload?.error || '')}
      bodyClassName="px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col gap-2"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {COLS.map((c) => (
                <th key={c.id} className={cn('px-2 py-2 font-semibold', c.align === 'right' ? 'text-right' : 'text-left')}>
                  <button
                    type="button"
                    className={cn('inline-flex items-center gap-1', c.align === 'right' && 'justify-end w-full')}
                    onClick={() => onSort(c.id)}
                  >
                    {c.label}
                    {sort.id === c.id ? (
                      sort.desc ? <ArrowDown size={10} className="text-brand" /> : <ArrowUp size={10} className="text-brand" />
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.03]">
                <td className="max-w-[220px] px-2 py-2 align-top">
                  <span className="block truncate font-sans text-[11px] text-white" title={r.label}>{r.label}</span>
                </td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.views)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.calls)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.website)}</td>
                <td className="px-2 py-2 text-right align-top font-mono text-[11px] tabular-nums text-white">{formatNumber(r.directions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        onPage={setPage}
        pageSize={pageSize}
        onPageSize={setPageSize}
        total={total}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        className="mt-auto border-t border-surface-border/80 pt-1"
      />
    </BlockCard>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GmbByLocationTable.jsx
git commit -m "feat(gbp): by-location table component"
```

---

### Task 12: Rewrite GoogleMeuNegocio page

**Files:**
- Modify: `src/pages/GoogleMeuNegocio.jsx` (full rewrite)

**Interfaces:**
- Consumes: `PlatformOverviewProvider`, `buildPlatformOverviewUrl`, `useDashboardFilters`, `useOrgWorkspace`, `usePlatformOverview`, `DashboardGrid`, `ChannelAccountPicker`, `SuperAdminAccountTitle`, `BlockCard`, the four `Gmb*` components.
- Produces: default export `GoogleMeuNegocio`.

- [ ] **Step 1: Implement** — replace entire `src/pages/GoogleMeuNegocio.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Eye, Phone, Navigation, Globe, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import DashboardGrid from '@/components/DashboardGrid'
import SuperAdminAccountTitle from '@/components/SuperAdminAccountTitle'
import ChannelAccountPicker from '@/components/ChannelAccountPicker'
import { useOrgWorkspace } from '@/context/OrgWorkspaceContext'
import { useDashboardFilters } from '@/context/DashboardFiltersContext'
import { buildPlatformOverviewUrl } from '@/lib/platformOverviewUrl'
import { PlatformOverviewProvider, usePlatformOverview } from '@/components/PlatformOverviewProvider'
import GmbDailyChart from '@/components/GmbDailyChart'
import GmbSearchTermsTable from '@/components/GmbSearchTermsTable'
import GmbReviewsBlock from '@/components/GmbReviewsBlock'
import GmbByLocationTable from '@/components/GmbByLocationTable'

const KPI_ICONS = {
  'Visualizações': Eye,
  'Ligações': Phone,
  'Cliques no site': Globe,
  'Rotas': Navigation,
  'Conversas': MessageSquare,
}
const KPI_ORDER = ['Visualizações', 'Ligações', 'Cliques no site', 'Rotas', 'Conversas']

function GmbKpiCard({ index }) {
  const { data } = usePlatformOverview()
  const metrics = Array.isArray(data?.metrics) ? data.metrics : []
  const label = KPI_ORDER[index]
  const m = metrics.find((x) => x.label === label)
  const Icon = KPI_ICONS[label] ?? Eye
  const value = m?.value ?? '—'
  const delta = m?.deltaPct
  const isPos = typeof delta === 'number' && delta > 0
  const isNeg = typeof delta === 'number' && delta < 0
  return (
    <div className="kpi-card min-h-0 w-full shrink-0">
      <div className="flex items-center justify-between">
        <span className="kpi-label block truncate">{label}</span>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#34A853]/15">
          <Icon size={12} className="text-[#34A853]" />
        </div>
      </div>
      <span className="kpi-value mt-2 block truncate tabular-nums">{value}</span>
      <div className="kpi-delta-row min-w-0">
        {typeof delta === 'number' ? (
          <div className={cn('inline-flex shrink-0 items-center gap-1', isPos ? 'text-green-400' : isNeg ? 'text-red-400' : 'text-muted-foreground')}>
            {isPos ? <TrendingUp size={12} strokeWidth={2} /> : isNeg ? <TrendingDown size={12} strokeWidth={2} /> : null}
            <span>{isPos ? '+' : ''}{delta.toFixed(1)}%</span>
          </div>
        ) : (
          <span className="kpi-delta-note text-muted-foreground">no período</span>
        )}
      </div>
    </div>
  )
}

const KPI_BLOCKS = KPI_ORDER.map((label, i) => ({
  id: `gmb-kpi-${i}`,
  tier: 'primary',
  defaultColSpan: 1,
  defaultRowSpan: 1,
  minColSpan: 1,
  maxColSpan: 4,
  minRowSpan: 1,
  maxRowSpan: 3,
  render: () => <GmbKpiCard index={i} />,
}))

const GMB_DASHBOARD_BLOCKS = [
  ...KPI_BLOCKS,
  { id: 'gmb-daily', tier: 'secondary', defaultColSpan: 8, defaultRowSpan: 3, minColSpan: 3, maxColSpan: 12, minRowSpan: 2, maxRowSpan: 8, render: () => <GmbDailyChart /> },
  { id: 'gmb-terms', tier: 'secondary', defaultColSpan: 4, defaultRowSpan: 4, minColSpan: 2, maxColSpan: 8, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbSearchTermsTable /> },
  { id: 'gmb-reviews', tier: 'secondary', defaultColSpan: 4, defaultRowSpan: 4, minColSpan: 2, maxColSpan: 8, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbReviewsBlock /> },
  { id: 'gmb-locations', tier: 'secondary', defaultColSpan: 8, defaultRowSpan: 3, minColSpan: 2, maxColSpan: 12, minRowSpan: 2, maxRowSpan: 10, render: () => <GmbByLocationTable /> },
]

function LocationPicker({ selectedLocationId, onChange }) {
  const { data } = usePlatformOverview()
  const locations = Array.isArray(data?.locations) ? data.locations : []
  if (locations.length <= 1) return null
  const current = selectedLocationId ?? data?.selectedLocationId ?? locations[0]?.id ?? ''
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[min(100%,220px)] shrink-0 rounded-md border border-surface-border bg-surface-input py-1.5 pl-2 pr-8 text-[10px] text-foreground font-sans outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      aria-label="Selecionar local"
    >
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </select>
  )
}

function GmbHeader({ selectedLocationId, onLocationChange }) {
  return (
    <header className="shrink-0 border-b border-white/[0.06] py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#34A853]">Google Meu Negócio</span>
          <span className="text-white/20" aria-hidden>·</span>
          <SuperAdminAccountTitle
            className="min-w-0 max-w-[min(100%,20rem)] text-left"
            size="sm"
            endpoint="/api/admin/platform/google-business-overview"
            emptyLabel="Perfil Google Business"
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LocationPicker selectedLocationId={selectedLocationId} onChange={onLocationChange} />
          <ChannelAccountPicker provider="google_business" className="shrink-0" />
        </div>
      </div>
    </header>
  )
}

function GmbInner({ selectedLocationId, onLocationChange }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col">
      <GmbHeader selectedLocationId={selectedLocationId} onLocationChange={onLocationChange} />
      <div className="min-h-0 flex-1">
        <DashboardGrid definitions={GMB_DASHBOARD_BLOCKS} className="min-h-full" />
      </div>
    </div>
  )
}

export default function GoogleMeuNegocio() {
  const { activeOrgId } = useOrgWorkspace()
  const { dateRange, compareDateRange, comparePrimaryKpi } = useDashboardFilters()
  const [selectedLocationId, setSelectedLocationId] = useState(null)

  const overviewUrl = useMemo(
    () =>
      buildPlatformOverviewUrl('/api/admin/platform/google-business-overview', {
        orgId: activeOrgId,
        dateRange,
        compareDateRange,
        compareEnabled: comparePrimaryKpi,
        filters: { locationId: selectedLocationId },
      }),
    [activeOrgId, dateRange, compareDateRange, comparePrimaryKpi, selectedLocationId]
  )

  return (
    <PlatformOverviewProvider url={overviewUrl}>
      <GmbInner selectedLocationId={selectedLocationId} onLocationChange={setSelectedLocationId} />
    </PlatformOverviewProvider>
  )
}
```

- [ ] **Step 2: Build to verify the whole app compiles**

Run: `npx vite build`
Expected: succeeds (3700+ modules transformed).

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all PASS (existing + new GBP tests).

- [ ] **Step 4: Commit**

```bash
git add src/pages/GoogleMeuNegocio.jsx
git commit -m "feat(gbp): wire real data dashboard page (provider, KPIs, blocks, location picker)"
```

---

### Task 13: Manual verification + spec caveats note

**Files:** none (verification only).

- [ ] **Step 1: Run dev server and sanity-check**

Run: `npm run dev` (in background), open the app, go to "Google Meu Negócio" as super admin.
Expected: KPIs/chart/terms/reviews populate from the real account; if a section's API is unavailable it shows its own amber error (not a crash). Switching location (when >1) refreshes data. Changing the global date range updates KPIs + chart.

- [ ] **Step 2: Confirm graceful degradation**

If reviews return 403 (allowlist mismatch on the real account), the reviews block shows the amber error and the rest of the dashboard still renders.

- [ ] **Step 3: Final full verification**

Run: `npx vitest run && npx vite build`
Expected: both succeed. This is the completion gate.

No commit (verification only). Report results to the user.

---

## Self-Review Notes

- **Spec coverage:** KPIs (Task 6 buildMetrics + Task 12), daily chart (Task 2 + 8), search terms monthly (Task 3 + 9), reviews v4 (Task 4 + 10), multi-location selector + by-location table (Task 5/6 + 11/12), graceful per-section degradation (every fetch returns `{error}`; blocks render amber), date handling since/until→daily/monthly + compare (Task 2/3/6/7), `location_id` plumbing (Task 1 + 7 + 12). Direct/discovery search omitted per spec caveat (not fetched).
- **Type consistency:** `HttpGet` defined in Task 2, imported by Tasks 3–7. `PerfTotals`/`PerfDaily` from Task 2 used in Task 6. Metric shape `{label,value,deltaPct}` consistent backend (Task 6) ↔ frontend KPI card (Task 12). Section payload keys (`searchKeywords`, `reviews`, `byLocation`, `daily`, `metrics`, `locations`, `selectedLocationId`) identical between core (Task 6), handler (Task 7), and components (Tasks 8–12).
- **No placeholders:** all steps contain real code/commands.
```
