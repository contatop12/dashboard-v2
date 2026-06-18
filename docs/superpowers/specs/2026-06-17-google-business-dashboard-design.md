# Dashboard Google Meu Negócio (Google Business Profile) — Design

**Data:** 2026-06-17
**Objetivo:** Transformar a aba "Google Meu Negócio" — hoje 100% mock — num dashboard com dados reais, filtros, tabelas e gráficos, espelhando a estrutura da aba Google Ads, porém voltado ao Google Business Profile (GBP).

## Estado atual

- **Frontend** [src/pages/GoogleMeuNegocio.jsx](../../../src/pages/GoogleMeuNegocio.jsx): dados 100% hardcoded (KPIs, séries semanais, termos, reviews). Usa `DashboardGrid`, `ChannelAccountPicker provider="google_business"` e `SuperAdminAccountTitle` apontando para `/api/admin/platform/google-business-overview`.
- **Backend** [functions/api/admin/platform/google-business-overview.ts](../../../functions/api/admin/platform/google-business-overview.ts): só lista **contas** GBP (Account Management API). Sem métricas, termos ou reviews reais.
- **Auth:** mesmo `GOOGLE_ADS_REFRESH_TOKEN` (OAuth client compartilhado) com escopo `business.manage`. `getGoogleAccessTokenFromEnv` já entrega access token. Reviews v4 já **allowlisted** no projeto Google Cloud (confirmado pelo usuário).

## Abordagem escolhida

**Espelho completo do Google Ads.** Reusa a infra existente:
- `PlatformOverviewProvider` (um fetch, contexto compartilhado, evento `p12-overview-refresh`).
- `buildPlatformOverviewUrl` (org_id/worker query + `since`/`until` + filtros).
- `useDashboardFilters` (range de datas global + comparação).
- `BlockCard`, `TablePagination`/`usePagedRows`, gráficos recharts.
- Cada seção do payload carrega `error` próprio → degradação graciosa por bloco.

## APIs Google usadas

Base: `Authorization: Bearer <access>` (token do refresh com escopo `business.manage`). Sem developer-token (isso é só Ads).

1. **Account Management** — `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`
   Lista contas. `name` = `accounts/{accountId}`. Já implementado.

2. **Business Information (locais)** — `GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,title,storefrontAddress,metadata&pageSize=100`
   `name` = `locations/{locationId}`. Usado pro seletor de local e tabela por local.

3. **Performance (métricas diárias)** — `GET https://businessprofileperformance.googleapis.com/v1/locations/{locationId}:fetchMultiDailyMetricsTimeSeries`
   Query: `dailyMetrics` (repetido) + `dailyRange.startDate.{year,month,day}` + `dailyRange.endDate.{year,month,day}`.
   Métricas usadas:
   - `BUSINESS_IMPRESSIONS_DESKTOP_MAPS`, `BUSINESS_IMPRESSIONS_DESKTOP_SEARCH`, `BUSINESS_IMPRESSIONS_MOBILE_MAPS`, `BUSINESS_IMPRESSIONS_MOBILE_SEARCH` (somadas = Visualizações; Maps vs Busca e desktop vs mobile disponíveis pra detalhar)
   - `CALL_CLICKS` (Ligações), `WEBSITE_CLICKS` (Cliques site), `BUSINESS_DIRECTION_REQUESTS` (Rotas), `BUSINESS_CONVERSATIONS` (Conversas)
   Resposta: `multiDailyMetricTimeSeries[].dailyMetricTimeSeries[].timeSeries.datedValues[]` com `{date:{year,month,day}, value}` (value string, pode faltar = 0).

4. **Search keywords (termos)** — `GET https://businessprofileperformance.googleapis.com/v1/locations/{locationId}/searchkeywords/impressions/monthly?monthlyRange.startMonth.{year,month}&monthlyRange.endMonth.{year,month}`
   Resposta: `searchKeywordsCounts[]` com `{searchKeyword, insightsValue:{value | threshold}}`. `threshold` = mínimo (ex.: "<15"); marcar como aproximado.
   ⚠️ **Granularidade mensal** — não há diário. A tabela agrega por termo no range de meses coberto.

5. **Reviews** — `GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews?pageSize=50&orderBy=updateTime desc`
   Resposta: `reviews[]` (`reviewer.displayName`, `starRating` enum FIVE..ONE, `comment`, `updateTime`), `averageRating`, `totalReviewCount`. API legada v4 (allowlisted).

## Shape do payload (`google-business-overview`)

```ts
{
  configured: boolean,
  source: 'worker_env' | 'oauth_org' | 'assigned_env',
  accountDisplay: string | null,
  error: string | null,            // erro global (auth/conta)
  detail: string | null,
  primaryRange: { since, until },
  compareRange: { since, until } | null,

  locations: { id, label, address }[],   // id = locationId numérico
  selectedLocationId: string | null,

  metrics: { label, value, deltaPct }[],  // KPIs agregados (formato igual Google Ads)
  compareMetrics: { label, value }[] | null,
  daily: { date, views, viewsMaps, viewsSearch, calls, website, directions, conversations }[],

  searchKeywords: {
    items: { keyword, impressions, approximate }[],
    monthsCovered: string | null,
    error: string | null
  },

  reviews: {
    items: { id, author, rating, comment, date }[],
    averageRating: number | null,
    totalCount: number | null,
    distribution: { 1:n,2:n,3:n,4:n,5:n },
    error: string | null
  },

  byLocation: {                    // só quando há >1 local
    items: { id, label, views, calls, website, directions }[],
    error: string | null
  }
}
```

Cada subseção (`searchKeywords`, `reviews`, `byLocation`) tem `error` própria; uma falha não derruba o resto. Padrão idêntico ao google-ads-overview (`EMPTY_*` + try/catch por fetch).

## Módulos backend (espelha divisão `google-ads-*`)

- `functions/_lib/google-business-locations.ts` — `fetchBusinessLocations(access, accountId)` → `{ id, label, address }[]`.
- `functions/_lib/google-business-performance.ts` — `fetchPerformanceDaily(access, locationId, since, until)` → série + agregados; parsing de `datedValues`, soma de impressões, gaps preenchidos. Funções puras de agregação testáveis isoladamente.
- `functions/_lib/google-business-keywords.ts` — `fetchSearchKeywords(access, locationId, since, until)` → termos ordenados por impressões.
- `functions/_lib/google-business-reviews.ts` — `fetchReviews(access, accountId, locationId)` → lista + média + distribuição; mapeia `starRating` enum→número.
- `google-business-overview.ts` (handler) — resolve conta → locais → escolhe local (`location_id` da query ou primeiro) → dispara performance/keywords/reviews/byLocation em `Promise.all`, monta payload. Mantém os ramos atuais de auth (org vs worker_env) e mensagens de "não configurado".

A descoberta de conta/locais (chamada extra) roda antes do `Promise.all`; resultados parametrizam as chamadas seguintes.

## Frontend

`GoogleMeuNegocio.jsx` reescrito no padrão da `GoogleAds.jsx`:

```
export default function GoogleMeuNegocio() {
  // activeOrgId, workerQuery, dateRange (useDashboardFilters), selectedLocationId (estado local)
  // overviewUrl = buildPlatformOverviewUrl('/api/admin/platform/google-business-overview', {..., filters:{ locationId }})
  return <PlatformOverviewProvider url={overviewUrl}><GmbInner .../></PlatformOverviewProvider>
}
```

`buildPlatformOverviewUrl` ganha suporte a `filters.locationId` → param `location_id` (extensão mínima, não quebra Ads/Meta).

Blocos (componentes próprios consumindo `usePlatformOverview()`):
1. **KPIs** (`GmbKpiCard` por métrica) — Visualizações, Ligações, Cliques site, Rotas, Conversas. Delta vs comparação.
   ⚠️ **"Buscas diretas" e "Buscas por descoberta"** (do mock atual) **não existem** na Performance API nova — eram da Insights API v4 (`QUERIES_DIRECT`/`QUERIES_INDIRECT`), descontinuada. Ficam de fora; Visualizações detalha por Maps vs Busca em vez disso.
2. **Gráfico diário** (`GmbDailyChart`) — recharts AreaChart, toggle de métrica (views/calls/website/directions/conversations), persiste escolha em localStorage (igual `GOOGLE_DAILY_CHART_LS`).
3. **Termos de busca** (`GmbSearchTermsTable`) — tabela ordenável + `usePagedRows`/`TablePagination`. Coluna impressões marca "~" quando `approximate`. Nota de granularidade mensal.
4. **Avaliações** (`GmbReviewsBlock`) — média + barra de distribuição (5→1) + lista paginada. Erro 403 → aviso "Reviews requer My Business API v4".
5. **Resultados por local** (`GmbByLocationTable`) — só quando `locations.length > 1`. KPIs por local, tabela ordenável + paginação.

Seletor de local no header (ao lado do `ChannelAccountPicker`), aparece quando `locations.length > 1`; muda `selectedLocationId` → refaz overview.

Layout via `DashboardGrid` (mantém blocos arrastáveis/redimensionáveis como hoje), KPIs como blocos `primary`, demais como `secondary`.

## Tratamento de datas

`dateRange` (Date start/end) → `since`/`until` (YYYY-MM-DD) no `buildPlatformOverviewUrl`. Backend converte:
- Performance: `dailyRange.startDate/endDate` (year/month/day).
- Keywords: `monthlyRange.startMonth/endMonth` (year/month) — deriva meses do range.
- Reviews: sem range (lista recentes; range não suportado pela v4).

Comparação (`compare_since/until`) → segundo fetch de performance pros deltas dos KPIs (igual Google Ads). Reviews/keywords/byLocation não comparam.

## Tratamento de erros / degradação

- Erro de auth/conta → payload com `error` global + seções vazias (`configured` indica setup).
- Cada seção: try/catch no fetch, devolve `{ items:[], error }`; bloco mostra aviso amigável.
- Performance lag: se range incluir últimos ~3 dias e vier vazio, nota "dados têm atraso de ~3 dias".
- Threshold de keywords: impressões aproximadas marcadas com "~".

## Testes

- **Backend puro (vitest):** agregação de performance (`datedValues` → soma/série, gaps), parsing de `starRating` enum→número + distribuição, parsing de keywords (`value` vs `threshold`), montagem do payload com mocks de `fetchRows`-like (injeção de fetcher, igual `fetchGoogleDemographicsPayload`).
- **Frontend (vitest + testing-library):** smoke dos blocos com payload mock (KPIs, tabela paginada, estados de erro/empty/loading).
- Build (`vite build`) + suíte completa verde antes de concluir.

## Fora de escopo (fase 2)

- Posts/fotos do perfil, respostas a reviews, atributos/horários, Q&A.
- Comparação de datas em reviews/keywords.
- Cache do payload (cada visita refaz os fetches, igual Google Ads hoje).

## Riscos

- **Volume de chamadas multi-location:** `byLocation` faz 1 chamada de performance por local. Cap em N locais (ex.: 25) pra latência; locais além disso ficam fora da tabela com nota.
- **Disponibilidade de métricas:** nem todo perfil reporta todas as métricas (ex.: `BUSINESS_CONVERSATIONS` só com mensagens ativas). Métrica ausente = 0/—, não erro.
- **Reviews v4** é API legada; se o acesso mudar, o bloco degrada com aviso.
