# Dashboard Redesign — SP2: Google Ads em paridade + filtros reais + shell

**Data:** 2026-06-10
**Status:** Aprovado em brainstorming
**Antecessor:** SP1 (`2026-06-09-dashboard-redesign-design.md`) — Meta Ads como referência (BlockCard, tokens de status, CampaignTree, switch funcional).

## Objetivo

Levar a página **Google Ads** à paridade com a Meta Ads redesenhada, tornar os **filtros de dimensão funcionais de verdade** (server-side) em arquitetura reaproveitável pelas próximas plataformas, e padronizar o **shell global** (Sidebar, Header, FilterBar).

## Contexto / problemas encontrados

1. `FilterBar` usa `FILTER_OPTIONS` hardcoded com campanhas falsas ("Campanha_Leads_SP"). Só Meta Ads recebe opções live (`/api/orgs/:id/meta-ads-filters`).
2. `dimensionFilters` é cosmético: só `KeywordsHighlight` e `OverviewTable` (blocos mock) leem o valor. KPIs, gráficos, funil e demográficos ignoram filtros mesmo na Meta.
3. Google Ads não tem hierarquia de campanhas com status nem ação de pausar/ativar.
4. Shell com ícones em 5 tamanhos (10–14), fontes 9–12px sem escala, espaçamentos ad hoc.

## Seção 1 — Filtros server-side genéricos

**Modelo de dado.** `dimensionFilters` no `DashboardFiltersContext` passa a guardar `{ id, name }` por chave de filtro (hoje: string de nome). Limpar filtro = remover a chave.

**Transporte.** `buildPlatformOverviewUrl` ganha parâmetros de filtro (`campaignId`, `adGroupId`/`adsetId`, `adId`, `objective`, …). Os endpoints de overview traduzem:

- **Google:** cláusulas GAQL `WHERE campaign.id = X` / `ad_group.id = Y` nas queries de daily, conversões, demográficos, keywords.
- **Meta:** parâmetros `filtering`/`level` na Graph API insights.

KPIs, série diária, funil, conversões e demográficos são recalculados para o recorte no servidor.

**Opções dos filtros.** Derivadas da árvore de campanhas que o overview já retorna — sem endpoint novo. Como o `FilterBar` é renderizado fora do `PlatformOverviewProvider` da página, a página **publica as opções no `DashboardFiltersContext`** (`setFilterOptions`) quando o overview carrega; o `FilterBar` apenas consome. O endpoint `meta-ads-filters` é aposentado ao final.

**Árvore sempre completa.** O backend retorna a árvore inteira independente dos filtros (para as opções não encolherem); o recorte é aplicado na árvore client-side (os dados já estão presentes) e nos agregados server-side.

**Página Geral.** Mantém apenas data + comparação; filtros de dimensão cross-platform não têm semântica server-side. `FILTER_OPTIONS` mock é deletado.

## Seção 2 — CampaignTree genérico + switch funcional Google

**Componente.** `CampaignTree` parametrizado por config de plataforma:

- Labels de níveis: Meta "Campanha → Conjunto → Anúncio"; Google "Campanha → Grupo de anúncios → Anúncio".
- Labels/seleção de métricas por plataforma (CTR link vs CTR, resultados vs conversões).
- Endpoint de mutate por plataforma.

**Hook.** `useCampaignStatusMutation` recebe endpoint/plataforma em vez de URL fixa Meta.

**Backend Google.**

- `google-ads-overview.ts` passa a retornar árvore `campaign → adGroup → ad` com status efetivo e métricas por nó.
- Novo endpoint `google-campaign-status` (POST) usando `campaigns:mutate` / `adGroups:mutate` / `adGroupAds:mutate`. O scope OAuth `adwords` já cobre escrita.

**UX.** Mesmo padrão SP1: cores por status efetivo (verde ACTIVE, vermelho problema, neutro pausado), switch com ConfirmDialog, revert visual + mensagem da API em falha.

## Seção 3 — Shell polish (Sidebar, Header, FilterBar)

- **Ícones:** lucide em 2 tamanhos apenas — 16 (navegação/ações) e 12 (inline em selects/chips).
- **Espaçamento:** escala 4px; alturas unificadas — `h-8` controles de filtro, `h-9` ações do header.
- **Tipografia:** 12px base em controles, 11px secundário; eliminar `text-[9px]`/`text-[10px]` do shell.
- **FilterBar:** selects com campo de busca (listas reais de campanhas podem ser longas), chip de filtro ativo com X para limpar, botão "Limpar filtros" quando ≥1 ativo. Botão refresh refaz o overview da página atual (deixa de ser Meta-only).

## Seção 4 — Erros e testes

- TDD com vitest (padrão SP1). Cobertura mínima:
  - `buildPlatformOverviewUrl` com filtros (unit).
  - Builder de cláusulas GAQL `WHERE` (unit, função pura).
  - Montagem da árvore Google a partir das respostas GAQL (unit, função pura).
  - Derivação de opções de filtro a partir da árvore (unit).
  - `useCampaignStatusMutation` genérico (unit com fetch mockado).
  - `FilterBar` render por página e fluxo de seleção/limpeza (component test).
- Overview com filtro inválido → `BlockState` em modo erro.
- Mutate em falha → switch reverte + toast com mensagem da API.

## Fora de escopo (SP3+)

Instagram, Google Meu Negócio, redesign profundo da Geral, Clientes, Configurações. A generalização da Seção 1/2 é desenhada para que essas telas entrem de graça na sequência.

## Riscos

- Cota/latência da Google Ads API ao montar árvore completa em contas grandes — mitigar limitando profundidade de anúncios aos top N por gasto se necessário (decidir na implementação com dados reais).
- Mutate Google exige `login-customer-id`/MCC correto — reusar a resolução de conta já existente no overview.
