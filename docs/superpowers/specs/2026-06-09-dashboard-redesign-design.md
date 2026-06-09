# Redesign da Dashboard — Design (SP1)

**Data:** 2026-06-09
**Status:** Aprovado para implementação (SP1)
**Autor:** P12 + Claude

---

## 1. Contexto e Problema

A dashboard (`dashboard-v2`, React 18 + Vite + Tailwind + Radix + recharts + react-grid-layout, deploy Cloudflare Pages/Workers) cresceu para 8 páginas (Meta Ads, Google Ads, Instagram, Google Meu Negócio, Geral, Clientes, etc.). Apesar de existir um design system (tokens em [`src/index.css`](../../../src/index.css), página [`DesignSystem.jsx`](../../../src/pages/DesignSystem.jsx)) e um editor de layout (react-grid-layout), o resultado visual está inconsistente e "buggado".

Problemas concretos identificados na auditoria inicial (página de referência: [`src/pages/MetaAds.jsx`](../../../src/pages/MetaAds.jsx)):

1. **Dados mock disfarçados de reais.** `videoMetrics` (retenção `12.99/7.61/5.36/2.8%`, linha 90), `engMetrics` (`1842 curtidas`...), `META_CREATIVES_MOCK` renderizam mesmo sem dados da API. O `12.99%` que aparece no print do cliente é hardcode, não API → parece bug/fake.
2. **Hex inline furando os tokens.** `#4A90D9`, `#4A9BFF`, `#FF6B6B`, etc. espalhados nos componentes em vez de usar `--color-*`. Drift de design system.
3. **Raios e bordas inconsistentes.** `.kpi-card` usa `rounded-xl` + borda `rgba(255,255,255,0.06)`; blocos usam `rounded-lg` + `border-surface-border`. Visual desalinhado.
4. **Empty states divergentes.** Gráfico vazio mostra eixo `0–4`; donut vazio cinza; mensagens diferentes por bloco; sem skeleton de loading padronizado.
5. **Status como pill de texto** (`● Ativo / ● Pausado / ● Outro`, [MetaAds.jsx:473](../../../src/pages/MetaAds.jsx#L473)) — o cliente quer **switch funcional**.
6. **Zero explicação de métrica.** Nenhum lugar mostra o que cada métrica significa.
7. **Tabela de campanhas flat** — o cliente quer a visão hierárquica **Campanha → Conjunto → Anúncio** com bordas/fundos coloridos por status (referência: prints enviados).

## 2. Objetivos / Não-objetivos

**Objetivos (SP1):**
- Estabelecer uma fundação de design system reutilizável (tokens + componentes compartilhados) que propaga consistência para as 8 páginas.
- Redesenhar a página **Meta Ads** como implementação de referência.
- Substituir a tabela flat por um `CampaignTree` hierárquico, colorido por `effective_status`, com switch funcional.
- Adicionar dicionário central de métricas com explicações via tooltip `(i)`.
- Switch de status **funcional** na Meta (pausa/ativa campanha de verdade).

**Não-objetivos (SP1):**
- Corrigir o erro de backend `"Application has been deleted"` (token/app Meta inválido). É infra/credencial, não design. Será tratado à parte. O switch funcional fica montado mas só surte efeito quando o token tiver scope `ads_management` válido.
- Redesenhar as outras 7 páginas (sequenciado em SP2+).
- Switch funcional no Google Ads (SP2 — precisa adicionar lista de campanhas com status ao overview do Google).

## 3. Decomposição em Sub-projetos

| SP | Escopo | Entrega |
|----|--------|---------|
| **SP1** (este spec) | Fundação + componentes compartilhados + dicionário + redesign **Meta Ads** + `CampaignTree` + switch Meta funcional | Página-referência pronta + base reutilizável |
| SP2 | **Google Ads**: redesign + lista de campanhas com status no overview + `CampaignTree` (Campanha→Grupo→Anúncio) + switch Google funcional | — |
| SP3+ | Instagram, Google Meu Negócio, Geral, Clientes, Relatórios — rollout do sistema | — |

Cada SP tem seu próprio ciclo spec → plano → implementação. Este documento cobre SP1.

## 4. Arquitetura — Camada Compartilhada

Todas as páginas montam um array de `block definitions` (`{ id, tier, defaultColSpan, defaultRowSpan, render() }`) e passam ao `DashboardGrid` com um `pageId`. Consertando a camada base **uma vez**, a consistência propaga para todas as páginas no rollout.

```
src/
  lib/
    metricsDictionary.js     (novo) — fonte única de métricas + explicações
    chartTheme.js            (novo) — paleta de gráfico a partir de CSS vars
  components/
    ui/
      BlockCard.jsx          (novo) — shell único de bloco
      Switch.jsx             (novo) — toggle acessível
      MetricInfo.jsx         (novo) — ícone (i) + tooltip
      BlockState.jsx         (novo) — loading / empty / error padronizados
    CampaignTree.jsx         (novo) — árvore Campanha→Conjunto→Anúncio
functions/
  api/admin/platform/
    meta-campaign-status.ts  (novo) — POST mutate status (Meta)
    meta-overview.ts         (editar) — adicionar adset level + parent links + budget
```

## 5. Design Tokens

Estender [`src/index.css`](../../../src/index.css) e [`tailwind.config.js`](../../../tailwind.config.js):

- **Status semântico** (RGB channels, para suportar `/opacity`):
  - `--color-success: 34 197 94` (verde)
  - `--color-warning: 245 197 24` (já é o brand — usar para "atenção leve")
  - `--color-danger: 239 68 68` (vermelho)
- **Paleta de gráfico** como CSS vars: `--chart-1`…`--chart-6` (mapeando os hex atuais `#F5C518, #9B8EFF, #4A9BFF, #FF6B6B, #22c55e, #f97316`). Componentes recharts leem de `chartTheme.js` em vez de hex inline.
- **Regra:** nenhum hex literal em componente. Cor sempre via token (`text-success`, `bg-danger/10`, `var(--chart-2)`).

## 6. Componentes Compartilhados

### 6.1 `BlockCard` (`ui/BlockCard.jsx`)
Shell visual único de bloco. Props: `title`, `info` (chave do dicionário → renderiza `MetricInfo`), `actions` (slot direito, ex: sort), `badge`, `state` (`loading|empty|error|ready`), `children`.
- Radius `rounded-xl`, borda e padding consistentes (alinhar com `.kpi-card`).
- Header: título (`.section-title`) + `(i)` opcional + ações à direita.
- Substitui o padrão `bg-surface-card border border-surface-border rounded-lg p-4` repetido. **Esta peça sozinha resolve a inconsistência de raio/borda nas 8 páginas.**

### 6.2 `Switch` (`ui/Switch.jsx`)
Toggle acessível. Props: `checked`, `onCheckedChange`, `disabled`, `loading`, `size`, `aria-label`.
- `role="switch"`, `aria-checked`, navegável por teclado (Space/Enter).
- Visual: trilho cinza (off) → laranja/brand (on); knob desliza; spinner quando `loading`.
- Touch target mínimo 44×44 (área clicável).
- **Não usa `opacity` para disabled** (token dedicado).

### 6.3 `MetricInfo` (`ui/MetricInfo.jsx`)
Ícone `(i)` (`lucide-react` `Info`, 12–14px) + `Tooltip` Radix (`@radix-ui/react-tooltip` já instalado). Props: `metricKey`. Lê `{ label, definition, formula }` do dicionário. Em mobile, o toque abre o tooltip (Radix `Tooltip` + `Popover` fallback).

### 6.4 `metricsDictionary` (`lib/metricsDictionary.js`)
Fonte única. Forma:
```js
export const METRICS = {
  invest: { label: 'Investimento', definition: '...', formula: null, platform: 'all', tier: 'primary' },
  ...
}
```
KPI cards, headers de tabela e `MetricInfo` leem daqui. Conteúdo completo na seção 9.

### 6.5 `BlockState` (`ui/BlockState.jsx`)
Estados padronizados, usados via `BlockCard.state`:
- **loading** — skeleton (linhas/cards cinza pulsando), não texto "Carregando…".
- **empty** — ícone neutro + mensagem curta contextual ("Nenhuma campanha no período").
- **error** — faixa âmbar com a mensagem da API.

## 7. `CampaignTree` (`components/CampaignTree.jsx`)

Substitui `MetaCampaignsTable`. Visão hierárquica expansível (referência: prints do cliente).

**Estrutura:**
```
▸ Campanha [P12] [ABO] [LEAD] FORM.COND. · LEADS · R$25D    [switch]  INVEST | LEADS | CUSTO/RES | CTR LINK | CPM
   └ ▸ Conjunto [FORMULARIO META] [VALIDANDO] · R$35/dia    [switch]  INVEST | LEADS | CUSTO/RES | CTR LINK | CPM
        └ Anúncios (2) [grid de cards]
             ┌──────────────┐  ┌──────────────┐
             │ thumbnail     │  │ thumbnail     │
             │ [AD001]  [sw] │  │ [ADVID001][sw]│
             │ INVEST/LEADS  │  │ INVEST/LEADS  │
             └──────────────┘  └──────────────┘
```

**Comportamento:**
- Cada nível (campanha, conjunto, anúncio) tem `Switch` próprio que chama o endpoint mutate do nível correspondente.
- Sort "Maior gasto" por nível (dropdown reaproveitado de `MetaCreativesSettingsModal`/padrão existente).
- Anúncios renderizam como cards com `creative.thumbnail_url` (já retornado pelo backend).
- KPIs inline lidos do dicionário (rótulo + `(i)`). "Resultado" e seu rótulo dependem do `objective` (LEADS → "Leads (formulário)", APP_PROMOTION → "Instalações do app", etc.).

**Cor por `effective_status` (Meta):**

| Cor | effective_status | Significado |
|-----|------------------|-------------|
| 🟩 verde (borda + fundo `success/8%`) | `ACTIVE` | rodando saudável |
| 🟥 vermelho (borda + fundo `danger/8%`) | `DISAPPROVED`, `WITH_ISSUES`, `PENDING_REVIEW` (rejeitado), `AD_PAUSED` por problema, `CAMPAIGN_PAUSED` com issue | atenção |
| ⬜ neutro | `PAUSED`, `ADSET_PAUSED`, `CAMPAIGN_PAUSED` | pausada |

Função `mapEffectiveStatusToColor(status)` centraliza a regra. Reutilizada no SP2 (Google: Campanha→Grupo→Anúncio).

## 8. Switch Funcional — Backend

### 8.1 Meta (SP1)
Novo endpoint `functions/api/admin/platform/meta-campaign-status.ts`:
- `POST` body `{ orgId, level: 'campaign'|'adset'|'ad', id, status: 'ACTIVE'|'PAUSED' }`.
- Resolve token via `getActiveConnectionForOrg` + `decryptMetaAccessToken` (mesmo plumbing do overview).
- Chamada: `POST https://graph.facebook.com/v21.0/{id}` com `status=PAUSED|ACTIVE`.
- **Requer scope `ads_management`** no token (leitura usa `ads_read`). Se o token não tiver, retorna erro claro → o switch reverte (rollback otimista) e mostra toast. **Não funciona até o token Meta ser renovado com `ads_management`.**
- Guard: `requireSuperAdmin` / `userCanAccessOrg`.

### 8.2 Google (SP2 — fora deste spec, registrado)
- Adicionar lista de campanhas (`campaign.id, name, status, metrics`) ao `google-ads-overview.ts`.
- Novo `google-campaign-status.ts`: `customers/{cid}/campaigns:mutate` com `updateMask=status`. Scope `adwords` (já concedido) cobre escrita. Reusa dev-token + access-token existentes.

### 8.3 UI (otimista + confirmação)
- Clicar no switch → **dialog de confirmação** ("Pausar a campanha X? Isso afeta a entrega ao vivo.").
- Confirmado → atualização otimista (switch muda na hora, `loading`) → POST.
- Sucesso → mantém. Erro → reverte + toast com a mensagem.

## 9. Dicionário de Métricas (conteúdo)

Conteúdo de `metricsDictionary.js`. Explicações em PT-BR, curtas, acionáveis.

### Primárias (todas as plataformas)
- **Investimento** — Total gasto no período.
- **Conversões / Resultados** — Volume de resultados (lead via formulário nativo, clique no WhatsApp, ligação). O rótulo varia pelo objetivo.
- **Custo por resultado (CPL / CPA)** — Investimento ÷ resultados. Quanto custa cada lead/ação.
- **Taxa de conversão (clique → lead)** — Resultados ÷ cliques. Mede eficiência do funil pós-clique.
- **Valor de conversão + ROAS** *(só e-commerce)* — Receita atribuída (pixel) e retorno sobre o investimento (valor ÷ gasto).

### Secundárias — Meta (nativas)
- **CTR no link** — Cliques no link ÷ impressões. Usar este, não o CTR "de todos" (que infla com engajamento).
- **CPC no link** — Custo por clique no link.
- **CPM** — Custo por mil impressões.
- **Frequência** — Média de vezes que cada pessoa viu o anúncio. Alta = saturação de público.
- **Alcance** — Pessoas únicas atingidas.
- **Hook rate / Retenção de vídeo** — Reprodução a 25/50/75/100% e ThruPlay. Avalia criativo em vídeo.
- **Índice de qualidade (3 rankings)** — Rankings de qualidade, engajamento e taxa de conversão (vs concorrentes do leilão).

### Secundárias — Google (nativas)
- **CTR** — Cliques ÷ impressões.
- **CPC médio** — Custo médio por clique.
- **Parcela de impressões (IS)** — % das impressões possíveis que você obteve.
- **IS perdida por orçamento** — % de impressões perdidas por verba insuficiente. Sinal direto para escalar orçamento.
- **IS perdida por classificação** — % perdida por ranking. Sinal de lance ou qualidade.
- **Parcela no topo / topo absoluto** — % de aparições no topo (e no topo absoluto) da página.
- **Índice de qualidade + componentes** — Nota geral + CTR esperado, relevância do anúncio, experiência na LP.
- **Termos de pesquisa** — Termos reais que dispararam anúncios. Onde se corta desperdício (negativas).

## 10. Estados (loading / vazio / erro)

- **Eliminar dados mock** (`videoMetrics`, `engMetrics`, `META_CREATIVES_MOCK`): blocos passam a renderizar dado real quando presente, `BlockState empty` quando não. Resolve direto o "parece bug/fake".
- Loading → skeleton padronizado.
- Erro da API → faixa âmbar (não derruba o bloco).

## 11. Layout / Hierarquia

- Mantém o editor react-grid-layout.
- Corrige layouts default: KPIs (tier `primary`) no topo → gráficos no meio → tabelas/árvore embaixo (guia do `analytics-report-writer`).
- Suaviza o fundo (`.dashboard-area-bg` — dot-grid + radial rosa está pesado; reduzir opacidade/raio).

## 12. Fluxo de Dados

- `MetaAds` → `PlatformOverviewProvider(url)` → `usePlatformOverview()` (já existe).
- Backend `meta-overview.ts` passa a retornar `tree` (campanhas com `adsets[]` com `ads[]`, cada um com `id, name, effectiveStatus, status, budget, objective, metrics{...}`), além dos campos atuais.
- `CampaignTree` consome `data.tree`. Switch → `POST meta-campaign-status` → re-fetch ou patch otimista do nó.

## 13. Tratamento de Erros / Edge Cases

- Token sem `ads_management` → switch reverte + toast explicativo.
- Campanha sem conjuntos/anúncios no período → nó expande para `empty`.
- `effective_status` desconhecido → cor neutra (fallback).
- Conta sem dados → `BlockState empty` em todos os blocos (sem mock).
- Resultado nativo ausente para o objetivo → rótulo genérico "Resultados".

## 14. Testes

- **Unit:** `mapEffectiveStatusToColor` (cada status → cor correta), `metricsDictionary` (todas as chaves usadas existem), montagem da árvore (campanha→adset→ad com órfãos tratados).
- **Componente:** `Switch` (teclado, aria, estados), `BlockState` (3 estados), `CampaignTree` (expand/collapse, cor por status).
- **Manual:** redesign Meta Ads renderiza sem mock; switch mostra confirmação + rollback em erro simulado.

## 15. Riscos / Dependências

- **Token Meta inválido** (`Application has been deleted`): switch funcional Meta só age após renovar o app/token com scope `ads_management`. UI fica pronta; sem efeito real até lá. (Fora do escopo de design.)
- Volume de queries Meta (campaign + adset + ad insights) pode pesar — paginar (`limit=500`, já o padrão) e paralelizar com `Promise.all`.
- Mutate em campanha ao vivo é irreversível na entrega → dialog de confirmação obrigatório.

## 16. Sequência de Implementação (resumo)

1. Tokens (índex.css + tailwind.config) + `chartTheme.js`.
2. `metricsDictionary.js` (conteúdo da seção 9).
3. `BlockCard`, `Switch`, `MetricInfo`, `BlockState`.
4. Backend `meta-overview.ts`: adset level + parent links + budget + `tree`.
5. `CampaignTree.jsx` + `mapEffectiveStatusToColor`.
6. `meta-campaign-status.ts` (mutate) + dialog de confirmação + UI otimista.
7. Refatorar `MetaAds.jsx`: trocar shells por `BlockCard`, remover mock, aplicar dicionário, inserir `CampaignTree`.
8. Ajustar layout default + fundo.
9. Testes.
