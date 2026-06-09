# Dashboard Redesign SP1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared design-system foundation (tokens + reusable components + metrics dictionary), redesign the Meta Ads page as the reference, and ship a hierarchical color-coded `CampaignTree` with a functional Meta status switch.

**Architecture:** Pages build `block definitions` → `DashboardGrid`. We fix the shared layer once (BlockCard shell, Switch, MetricInfo, BlockState, metricsDictionary, chartTheme) so consistency propagates. The flat campaign table is replaced by `CampaignTree` (Campaign → Ad Set → Ad), colored by Meta `effective_status`, each node carrying a functional Switch backed by a new mutate endpoint.

**Tech Stack:** React 18, Vite, TailwindCSS (CSS-var tokens), Radix UI (tooltip/dialog), recharts, Cloudflare Pages Functions (TypeScript), Vitest + @testing-library/react (added in Task 0).

---

## File Structure

**New files:**
- `vitest.config.js` — test runner config
- `src/test/setup.js` — testing-library jsdom setup
- `src/lib/chartTheme.js` — chart palette (single source for recharts colors)
- `src/lib/metricsDictionary.js` — metric label + definition + formula, single source
- `src/lib/campaignStatus.js` — `mapEffectiveStatusToColor` (Meta status → color key)
- `src/components/ui/Switch.jsx` — accessible toggle
- `src/components/ui/MetricInfo.jsx` — `(i)` icon + Radix tooltip
- `src/components/ui/BlockState.jsx` — loading/empty/error states
- `src/components/ui/BlockCard.jsx` — single block shell
- `src/components/ui/ConfirmDialog.jsx` — confirmation modal for live mutations
- `src/components/CampaignTree.jsx` — Campaign→AdSet→Ad hierarchy
- `src/hooks/useCampaignStatusMutation.js` — optimistic mutate + rollback
- `functions/_lib/meta-tree.ts` — pure tree assembly from flat Graph maps
- `functions/api/admin/platform/meta-campaign-status.ts` — POST mutate status
- Test files alongside each (`*.test.js` / `*.test.jsx` / `*.test.ts`)

**Modified files:**
- `package.json` — add test devDeps + `test` script
- `src/index.css` — add status tokens; soften `.dashboard-area-bg`
- `tailwind.config.js` — add `success`/`danger` colors
- `functions/api/admin/platform/meta-overview.ts` — fetch adset level + parent links + budget; return `tree`
- `src/pages/MetaAds.jsx` — remove mock; use BlockCard/dictionary; insert CampaignTree; fix default layout order

---

## Task 0: Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/test/setup.js`
- Test: `src/test/smoke.test.js`

- [ ] **Step 1: Add dev deps + test script to `package.json`**

Add to `devDependencies`:
```json
"vitest": "^2.1.4",
"@testing-library/react": "^16.0.1",
"@testing-library/jest-dom": "^6.6.3",
"@testing-library/user-event": "^14.5.2",
"jsdom": "^25.0.1"
```
Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```
Then run: `npm install`

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}', 'functions/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Create `src/test/setup.js`**

```js
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

- [ ] **Step 4: Create smoke test `src/test/smoke.test.js`**

```js
import { describe, it, expect } from 'vitest'

describe('test infra', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS (1 test). Confirms vitest + jsdom + alias work.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test/setup.js src/test/smoke.test.js
git commit -m "test: add vitest + testing-library infrastructure"
```

---

## Task 1: Design Tokens (status + chart palette)

**Files:**
- Modify: `src/index.css:5-24` (`:root` block)
- Modify: `tailwind.config.js:10-28` (colors)
- Create: `src/lib/chartTheme.js`
- Test: `src/lib/chartTheme.test.js`

- [ ] **Step 1: Write failing test `src/lib/chartTheme.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { CHART_COLORS, chartColor } from './chartTheme'

describe('chartTheme', () => {
  it('exposes 6 hex colors', () => {
    expect(CHART_COLORS).toHaveLength(6)
    for (const c of CHART_COLORS) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
  it('chartColor wraps by index', () => {
    expect(chartColor(0)).toBe(CHART_COLORS[0])
    expect(chartColor(6)).toBe(CHART_COLORS[0])
    expect(chartColor(7)).toBe(CHART_COLORS[1])
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- chartTheme`
Expected: FAIL (cannot find module `./chartTheme`).

- [ ] **Step 3: Create `src/lib/chartTheme.js`**

```js
// Single source for recharts colors. Mirrors --chart-* in index.css.
export const CHART_COLORS = ['#F5C518', '#9B8EFF', '#4A9BFF', '#FF6B6B', '#22C55E', '#F97316']

export function chartColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length]
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- chartTheme`
Expected: PASS.

- [ ] **Step 5: Add status tokens to `src/index.css` `:root`**

Inside the `:root` block (after `--color-muted-fg: 136 136 136;`), add:
```css
    --color-success: 34 197 94;
    --color-danger: 239 68 68;
    /* chart palette — mirror src/lib/chartTheme.js */
    --chart-1: 245 197 24;
    --chart-2: 155 142 255;
    --chart-3: 74 155 255;
    --chart-4: 255 107 107;
    --chart-5: 34 197 94;
    --chart-6: 249 115 22;
```

- [ ] **Step 6: Add `success`/`danger` to `tailwind.config.js` colors**

Inside `theme.extend.colors`, after `foreground: ...`, add:
```js
        success: 'rgb(var(--color-success) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
```

- [ ] **Step 7: Verify build still compiles**

Run: `npm run build`
Expected: build completes (Tailwind picks up new tokens). If wrangler step fails for unrelated env reasons, the `vite build` portion must still succeed.

- [ ] **Step 8: Commit**

```bash
git add src/index.css tailwind.config.js src/lib/chartTheme.js src/lib/chartTheme.test.js
git commit -m "feat: add status + chart design tokens"
```

---

## Task 2: Metrics Dictionary

**Files:**
- Create: `src/lib/metricsDictionary.js`
- Test: `src/lib/metricsDictionary.test.js`

- [ ] **Step 1: Write failing test `src/lib/metricsDictionary.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { METRICS, getMetric } from './metricsDictionary'

const REQUIRED_KEYS = [
  'invest', 'results', 'cpl', 'conversionRate', 'roas',
  'ctrLink', 'cpcLink', 'cpm', 'frequency', 'reach', 'videoRetention', 'qualityRanking',
  'ctr', 'cpcAvg', 'impressionShare', 'isLostBudget', 'isLostRank', 'topShare', 'qualityScore', 'searchTerms',
]

describe('metricsDictionary', () => {
  it('has every required metric with label + definition', () => {
    for (const k of REQUIRED_KEYS) {
      expect(METRICS[k], `missing ${k}`).toBeTruthy()
      expect(METRICS[k].label, `${k}.label`).toBeTruthy()
      expect(METRICS[k].definition, `${k}.definition`).toBeTruthy()
    }
  })
  it('getMetric returns a safe fallback for unknown keys', () => {
    const m = getMetric('does-not-exist')
    expect(m.label).toBe('does-not-exist')
    expect(m.definition).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- metricsDictionary`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/metricsDictionary.js`**

```js
// Single source of truth for metric labels, definitions, formulas.
// Consumed by KPI cards, table headers, and MetricInfo tooltips.
export const METRICS = {
  // Primary (all platforms)
  invest: { label: 'Investimento', definition: 'Total gasto no período.', formula: null, platform: 'all', tier: 'primary' },
  results: { label: 'Resultados', definition: 'Volume de resultados (lead via formulário nativo, clique no WhatsApp, ligação). O rótulo varia pelo objetivo.', formula: null, platform: 'all', tier: 'primary' },
  cpl: { label: 'Custo por resultado', definition: 'Quanto custa cada lead/ação.', formula: 'Investimento ÷ resultados', platform: 'all', tier: 'primary' },
  conversionRate: { label: 'Taxa de conversão', definition: 'Eficiência do funil pós-clique (clique → lead).', formula: 'Resultados ÷ cliques', platform: 'all', tier: 'primary' },
  roas: { label: 'ROAS', definition: 'Retorno sobre o investimento. Só e-commerce (valor de conversão via pixel).', formula: 'Valor de conversão ÷ gasto', platform: 'all', tier: 'primary' },

  // Secondary — Meta
  ctrLink: { label: 'CTR no link', definition: 'Usar este, não o CTR "de todos" (que infla com engajamento).', formula: 'Cliques no link ÷ impressões', platform: 'meta', tier: 'secondary' },
  cpcLink: { label: 'CPC no link', definition: 'Custo por clique no link.', formula: 'Gasto ÷ cliques no link', platform: 'meta', tier: 'secondary' },
  cpm: { label: 'CPM', definition: 'Custo por mil impressões.', formula: 'Gasto ÷ impressões × 1000', platform: 'meta', tier: 'secondary' },
  frequency: { label: 'Frequência', definition: 'Média de vezes que cada pessoa viu o anúncio. Alta = saturação de público.', formula: 'Impressões ÷ alcance', platform: 'meta', tier: 'secondary' },
  reach: { label: 'Alcance', definition: 'Pessoas únicas atingidas.', formula: null, platform: 'meta', tier: 'secondary' },
  videoRetention: { label: 'Retenção de vídeo', definition: 'Reprodução a 25/50/75/100% e ThruPlay. Avalia criativo em vídeo.', formula: null, platform: 'meta', tier: 'secondary' },
  qualityRanking: { label: 'Índice de qualidade', definition: 'Os 3 rankings (qualidade, engajamento e taxa de conversão) vs concorrentes do leilão.', formula: null, platform: 'meta', tier: 'secondary' },

  // Secondary — Google
  ctr: { label: 'CTR', definition: 'Taxa de cliques.', formula: 'Cliques ÷ impressões', platform: 'google', tier: 'secondary' },
  cpcAvg: { label: 'CPC médio', definition: 'Custo médio por clique.', formula: 'Gasto ÷ cliques', platform: 'google', tier: 'secondary' },
  impressionShare: { label: 'Parcela de impressões (IS)', definition: '% das impressões possíveis que você obteve.', formula: null, platform: 'google', tier: 'secondary' },
  isLostBudget: { label: 'IS perdida por orçamento', definition: '% de impressões perdidas por verba insuficiente. Sinal direto para escalar orçamento.', formula: null, platform: 'google', tier: 'secondary' },
  isLostRank: { label: 'IS perdida por classificação', definition: '% perdida por ranking. Sinal de lance ou qualidade.', formula: null, platform: 'google', tier: 'secondary' },
  topShare: { label: 'Parcela no topo / topo absoluto', definition: '% de aparições no topo (e topo absoluto) da página.', formula: null, platform: 'google', tier: 'secondary' },
  qualityScore: { label: 'Índice de qualidade', definition: 'Nota geral + componentes: CTR esperado, relevância do anúncio, experiência na LP.', formula: null, platform: 'google', tier: 'secondary' },
  searchTerms: { label: 'Termos de pesquisa', definition: 'Termos reais que dispararam anúncios. Onde se corta desperdício (negativas).', formula: null, platform: 'google', tier: 'secondary' },
}

export function getMetric(key) {
  return METRICS[key] ?? { label: key, definition: '', formula: null, platform: 'all', tier: 'secondary' }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- metricsDictionary`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/metricsDictionary.js src/lib/metricsDictionary.test.js
git commit -m "feat: add central metrics dictionary"
```

---

## Task 3: Switch Component

**Files:**
- Create: `src/components/ui/Switch.jsx`
- Test: `src/components/ui/Switch.test.jsx`

- [ ] **Step 1: Write failing test `src/components/ui/Switch.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders with role switch and aria-checked', () => {
    render(<Switch checked aria-label="Status" onCheckedChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Status' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onCheckedChange with the next value on click', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} aria-label="Status" onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} disabled aria-label="Status" onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is busy and non-interactive when loading', async () => {
    const onChange = vi.fn()
    render(<Switch checked loading aria-label="Status" onCheckedChange={onChange} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- Switch`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/ui/Switch.jsx`**

```jsx
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Accessible on/off toggle. `<button role="switch">` handles Space/Enter natively.
 * on = brand/active, off = neutral, loading = spinner + non-interactive.
 */
export function Switch({ checked, onCheckedChange, disabled = false, loading = false, size = 'md', className, ...props }) {
  const inert = disabled || loading
  const dims = size === 'sm' ? { w: 'w-8', h: 'h-[18px]', knob: 'h-3.5 w-3.5', on: 'translate-x-[14px]' } : { w: 'w-11', h: 'h-6', knob: 'h-5 w-5', on: 'translate-x-5' }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={loading || undefined}
      disabled={inert}
      onClick={() => { if (!inert) onCheckedChange(!checked) }}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        dims.w, dims.h,
        checked ? 'bg-brand' : 'bg-muted',
        inert ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none flex items-center justify-center rounded-full bg-white shadow transition-transform',
          dims.knob,
          checked ? dims.on : 'translate-x-0'
        )}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
      </span>
    </button>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- Switch`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Switch.jsx src/components/ui/Switch.test.jsx
git commit -m "feat: add accessible Switch component"
```

---

## Task 4: MetricInfo Component

**Files:**
- Create: `src/components/ui/MetricInfo.jsx`
- Test: `src/components/ui/MetricInfo.test.jsx`

- [ ] **Step 1: Write failing test `src/components/ui/MetricInfo.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricInfo } from './MetricInfo'

describe('MetricInfo', () => {
  it('renders an info trigger labelled by the metric', () => {
    render(<MetricInfo metricKey="ctrLink" />)
    // aria-label exposes the metric label so screen readers announce context
    expect(screen.getByLabelText(/CTR no link/i)).toBeInTheDocument()
  })

  it('renders nothing-breaking for unknown keys', () => {
    render(<MetricInfo metricKey="nope" />)
    expect(screen.getByLabelText(/nope/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- MetricInfo`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/ui/MetricInfo.jsx`**

```jsx
import * as Tooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMetric } from '@/lib/metricsDictionary'

/** (i) trigger that reveals a metric's definition + formula from the dictionary. */
export function MetricInfo({ metricKey, size = 12, className }) {
  const m = getMetric(metricKey)
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            aria-label={`${m.label}${m.definition ? `: ${m.definition}` : ''}`}
            className={cn('inline-flex items-center text-muted-foreground transition-colors hover:text-foreground', className)}
          >
            <Info size={size} strokeWidth={2} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-[260px] rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl"
          >
            <p className="font-display text-[11px] font-semibold uppercase tracking-wide text-foreground">{m.label}</p>
            {m.definition ? <p className="mt-1 font-sans text-muted-foreground">{m.definition}</p> : null}
            {m.formula ? <p className="mt-1 font-mono text-[10px] text-brand">{m.formula}</p> : null}
            <Tooltip.Arrow className="fill-surface-card" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- MetricInfo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MetricInfo.jsx src/components/ui/MetricInfo.test.jsx
git commit -m "feat: add MetricInfo tooltip component"
```

---

## Task 5: BlockState Component

**Files:**
- Create: `src/components/ui/BlockState.jsx`
- Test: `src/components/ui/BlockState.test.jsx`

- [ ] **Step 1: Write failing test `src/components/ui/BlockState.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockState } from './BlockState'

describe('BlockState', () => {
  it('renders a skeleton in loading state', () => {
    render(<BlockState state="loading" />)
    expect(screen.getByTestId('block-skeleton')).toBeInTheDocument()
  })
  it('renders the empty message', () => {
    render(<BlockState state="empty" message="Nenhuma campanha no período" />)
    expect(screen.getByText('Nenhuma campanha no período')).toBeInTheDocument()
  })
  it('renders the error message in alert role', () => {
    render(<BlockState state="error" message="Token inválido" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Token inválido')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- BlockState`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/ui/BlockState.jsx`**

```jsx
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Standard loading/empty/error presentation used inside BlockCard. */
export function BlockState({ state, message, className }) {
  if (state === 'loading') {
    return (
      <div data-testid="block-skeleton" className={cn('flex flex-col gap-2', className)}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/60" />
        ))}
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div role="alert" className={cn('rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger', className)}>
        {message || 'Erro ao carregar dados.'}
      </div>
    )
  }
  if (state === 'empty') {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-center', className)}>
        <Inbox size={20} className="text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">{message || 'Sem dados no período.'}</p>
      </div>
    )
  }
  return null
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- BlockState`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/BlockState.jsx src/components/ui/BlockState.test.jsx
git commit -m "feat: add BlockState loading/empty/error component"
```

---

## Task 6: BlockCard Component

**Files:**
- Create: `src/components/ui/BlockCard.jsx`
- Test: `src/components/ui/BlockCard.test.jsx`

- [ ] **Step 1: Write failing test `src/components/ui/BlockCard.test.jsx`**

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockCard } from './BlockCard'

describe('BlockCard', () => {
  it('renders title, info trigger, actions, and children when ready', () => {
    render(
      <BlockCard title="Campanhas" infoKey="ctrLink" actions={<button>Sort</button>}>
        <p>conteudo</p>
      </BlockCard>
    )
    expect(screen.getByText('Campanhas')).toBeInTheDocument()
    expect(screen.getByLabelText(/CTR no link/i)).toBeInTheDocument()
    expect(screen.getByText('Sort')).toBeInTheDocument()
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })

  it('renders BlockState instead of children when state is empty', () => {
    render(
      <BlockCard title="Campanhas" state="empty" emptyMessage="Nada aqui">
        <p>conteudo</p>
      </BlockCard>
    )
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument()
    expect(screen.getByText('Nada aqui')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- BlockCard`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/ui/BlockCard.jsx`**

```jsx
import { cn } from '@/lib/utils'
import { MetricInfo } from './MetricInfo'
import { BlockState } from './BlockState'

/**
 * Single block shell. Replaces ad-hoc `bg-surface-card border rounded-lg p-4`.
 * Consistent radius/border/padding + header (title + info + actions).
 */
export function BlockCard({ title, infoKey, actions, badge, state = 'ready', emptyMessage, errorMessage, className, headerClassName, bodyClassName, children }) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-surface-card', className)}>
      {(title || actions || badge) && (
        <div className={cn('flex shrink-0 items-center justify-between gap-2 px-4 py-3', headerClassName)}>
          <div className="flex min-w-0 items-center gap-1.5">
            {title ? <span className="section-title truncate">{title}</span> : null}
            {infoKey ? <MetricInfo metricKey={infoKey} /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge ? <span className="font-mono text-[10px] text-muted-foreground">{badge}</span> : null}
            {actions}
          </div>
        </div>
      )}
      <div className={cn('min-h-0 flex-1 px-4 pb-4', bodyClassName)}>
        {state === 'ready' ? children : <BlockState state={state} message={state === 'empty' ? emptyMessage : errorMessage} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- BlockCard`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/BlockCard.jsx src/components/ui/BlockCard.test.jsx
git commit -m "feat: add BlockCard shell component"
```

---

## Task 7: Effective-Status → Color Mapping

**Files:**
- Create: `src/lib/campaignStatus.js`
- Test: `src/lib/campaignStatus.test.js`

- [ ] **Step 1: Write failing test `src/lib/campaignStatus.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { mapEffectiveStatusToColor, STATUS_COLOR } from './campaignStatus'

describe('mapEffectiveStatusToColor', () => {
  it('maps ACTIVE to success', () => {
    expect(mapEffectiveStatusToColor('ACTIVE')).toBe(STATUS_COLOR.success)
  })
  it('maps problem statuses to danger', () => {
    for (const s of ['DISAPPROVED', 'WITH_ISSUES', 'PENDING_REVIEW', 'PENDING_BILLING_INFO']) {
      expect(mapEffectiveStatusToColor(s), s).toBe(STATUS_COLOR.danger)
    }
  })
  it('maps paused statuses to neutral', () => {
    for (const s of ['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED']) {
      expect(mapEffectiveStatusToColor(s), s).toBe(STATUS_COLOR.neutral)
    }
  })
  it('falls back to neutral for unknown/empty', () => {
    expect(mapEffectiveStatusToColor('')).toBe(STATUS_COLOR.neutral)
    expect(mapEffectiveStatusToColor('SOMETHING_NEW')).toBe(STATUS_COLOR.neutral)
  })
  it('is case-insensitive', () => {
    expect(mapEffectiveStatusToColor('active')).toBe(STATUS_COLOR.success)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- campaignStatus`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/campaignStatus.js`**

```js
export const STATUS_COLOR = { success: 'success', danger: 'danger', neutral: 'neutral' }

const DANGER = new Set(['DISAPPROVED', 'WITH_ISSUES', 'PENDING_REVIEW', 'PENDING_BILLING_INFO', 'PENDING_PROCESSING'])
const NEUTRAL = new Set(['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS'])

/** Meta effective_status → color key used for tree border/background. */
export function mapEffectiveStatusToColor(status) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'ACTIVE') return STATUS_COLOR.success
  if (DANGER.has(s)) return STATUS_COLOR.danger
  if (NEUTRAL.has(s)) return STATUS_COLOR.neutral
  return STATUS_COLOR.neutral
}

/** Tailwind classes per color key for a tree row (border + tinted bg). */
export const STATUS_ROW_CLASS = {
  success: 'border-success/40 bg-success/[0.06]',
  danger: 'border-danger/40 bg-danger/[0.06]',
  neutral: 'border-surface-border bg-surface-card',
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- campaignStatus`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaignStatus.js src/lib/campaignStatus.test.js
git commit -m "feat: add effective-status color mapping"
```

---

## Task 8: Backend — Meta Tree Assembly (pure)

**Files:**
- Create: `functions/_lib/meta-tree.ts`
- Test: `functions/_lib/meta-tree.test.ts`

- [ ] **Step 1: Write failing test `functions/_lib/meta-tree.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { buildMetaTree, type MetaNodeInput } from './meta-tree'

const campaigns: MetaNodeInput[] = [
  { id: 'c1', name: 'Camp 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 25, parentId: null, metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 } },
]
const adsets: MetaNodeInput[] = [
  { id: 's1', name: 'Set 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 35, parentId: 'c1', metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 } },
  { id: 's-orphan', name: 'Orphan', effectiveStatus: 'PAUSED', objective: 'LEADS', dailyBudget: 0, parentId: 'missing', metrics: { spend: 0, results: 0, ctrLink: 0, cpm: 0 } },
]
const ads: MetaNodeInput[] = [
  { id: 'a1', name: 'AD001', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 0, parentId: 's1', thumbnailUrl: 'http://x/t.jpg', metrics: { spend: 246.71, results: 5, ctrLink: 2.09, cpm: 60 } },
]

describe('buildMetaTree', () => {
  it('nests adsets under campaigns and ads under adsets', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    expect(tree).toHaveLength(1)
    expect(tree[0].id).toBe('c1')
    expect(tree[0].adsets).toHaveLength(1)
    expect(tree[0].adsets[0].id).toBe('s1')
    expect(tree[0].adsets[0].ads).toHaveLength(1)
    expect(tree[0].adsets[0].ads[0].id).toBe('a1')
  })
  it('drops adsets whose parent campaign is missing', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    const ids = tree.flatMap((c) => c.adsets.map((s) => s.id))
    expect(ids).not.toContain('s-orphan')
  })
  it('carries thumbnail + budget + objective through', () => {
    const tree = buildMetaTree(campaigns, adsets, ads)
    expect(tree[0].adsets[0].ads[0].thumbnailUrl).toBe('http://x/t.jpg')
    expect(tree[0].dailyBudget).toBe(25)
    expect(tree[0].objective).toBe('LEADS')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- meta-tree`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `functions/_lib/meta-tree.ts`**

```ts
export type MetaMetrics = {
  spend: number
  results: number
  ctrLink: number
  cpm: number
  [k: string]: number
}

export type MetaNodeInput = {
  id: string
  name: string
  effectiveStatus: string
  objective: string
  dailyBudget: number
  parentId: string | null
  thumbnailUrl?: string | null
  metrics: MetaMetrics
}

export type MetaAdNode = MetaNodeInput
export type MetaAdsetNode = MetaNodeInput & { ads: MetaAdNode[] }
export type MetaCampaignNode = MetaNodeInput & { adsets: MetaAdsetNode[] }

/** Assemble Campaign → AdSet → Ad. Orphans (missing parent) are dropped. */
export function buildMetaTree(
  campaigns: MetaNodeInput[],
  adsets: MetaNodeInput[],
  ads: MetaNodeInput[]
): MetaCampaignNode[] {
  const adsByAdset = new Map<string, MetaAdNode[]>()
  for (const ad of ads) {
    if (!ad.parentId) continue
    const list = adsByAdset.get(ad.parentId) ?? []
    list.push(ad)
    adsByAdset.set(ad.parentId, list)
  }

  const adsetsByCampaign = new Map<string, MetaAdsetNode[]>()
  for (const set of adsets) {
    if (!set.parentId) continue
    const node: MetaAdsetNode = { ...set, ads: adsByAdset.get(set.id) ?? [] }
    const list = adsetsByCampaign.get(set.parentId) ?? []
    list.push(node)
    adsetsByCampaign.set(set.parentId, list)
  }

  return campaigns.map((c) => ({ ...c, adsets: adsetsByCampaign.get(c.id) ?? [] }))
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- meta-tree`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/meta-tree.ts functions/_lib/meta-tree.test.ts
git commit -m "feat: add pure Meta campaign-tree assembly"
```

---

## Task 9: Backend — Wire tree into meta-overview

**Files:**
- Modify: `functions/api/admin/platform/meta-overview.ts`

- [ ] **Step 1: Read the full file first**

Run: open `functions/api/admin/platform/meta-overview.ts` and locate: the campaign catalog fetch (`/campaigns?fields=id,name,objective,effective_status`, ~line 423), the ad catalog fetch (`fields=name,effective_status,creative{...}`, ~line 350), the `level=ad` and `level=campaign` insights fetches, and the final response bodies that already include `campaigns` (the success body near line 742 and the empty/error bodies). Note the helper that maps insight rows to metrics and `mapCampaignUiStatus`.

- [ ] **Step 2: Add adset-level fetches + parent links**

Add three fetch helpers modeled on the existing campaign/ad fetchers (same `graph.facebook.com/v21.0` base, same token query param, same pagination guard). They must return, per entity: `id, name, effective_status, objective` (campaign), `campaign_id, daily_budget` (adset), `adset_id, campaign_id, creative{thumbnail_url}` (ad), plus insight metrics (`spend`, results, `ctr` for link, `cpm`). Concretely:

- Adset catalog: `GET /{actId}/adsets?fields=id,name,effective_status,campaign_id,daily_budget&limit=500&access_token=...`
- Adset insights: `GET /{actId}/insights?level=adset&fields=adset_id,spend,actions,inline_link_click_ctr,cpm,reach,impressions&time_range=...&limit=500`
- Ad catalog already exists — extend its `fields` to add `adset_id,campaign_id`: change `fields=name,effective_status,creative{thumbnail_url,image_url}` → `fields=name,effective_status,adset_id,campaign_id,creative{thumbnail_url,image_url}`.
- Campaign catalog already exists — extend `fields` to add `daily_budget`: `fields=id,name,objective,effective_status,daily_budget`.

Map daily_budget from Graph (returned in cents as a string) to a number of reais: `Number(daily_budget) / 100`.

Build `MetaNodeInput[]` for each level (campaign/adset/ad) by joining catalog + insight maps on id, with `parentId` = campaign_id / adset_id respectively, and `results` taken from the objective's native action type (reuse existing action-extraction logic; default to leads).

- [ ] **Step 3: Assemble + return `tree`**

At the top of the file add:
```ts
import { buildMetaTree } from '../../../_lib/meta-tree'
```
Where the success body is built (the object that currently includes `campaigns`), add a `tree` field:
```ts
const tree = buildMetaTree(campaignNodes, adsetNodes, adNodes)
```
and include `tree` in the returned body. Add `tree: []` to every early-return body (empty/error/not-configured) so the shape is stable.

- [ ] **Step 4: Typecheck / build**

Run: `npx tsc --noEmit -p functions` if a tsconfig exists there, otherwise `npm run build`.
Expected: no type errors from the new code. (Network is not exercised here.)

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/platform/meta-overview.ts
git commit -m "feat: return campaign tree (adset+ad) from meta-overview"
```

---

## Task 10: CampaignTree Component

**Files:**
- Create: `src/components/CampaignTree.jsx`
- Test: `src/components/CampaignTree.test.jsx`

- [ ] **Step 1: Write failing test `src/components/CampaignTree.test.jsx`**

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampaignTree } from './CampaignTree'

const tree = [
  {
    id: 'c1', name: 'Camp Ativa', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 25,
    metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 },
    adsets: [
      {
        id: 's1', name: 'Conjunto 1', effectiveStatus: 'ACTIVE', objective: 'LEADS', dailyBudget: 35,
        metrics: { spend: 248.14, results: 5, ctrLink: 2.08, cpm: 60.77 },
        ads: [
          { id: 'a1', name: 'AD001', effectiveStatus: 'ACTIVE', objective: 'LEADS', thumbnailUrl: null, metrics: { spend: 246.71, results: 5, ctrLink: 2.09, cpm: 60 } },
        ],
      },
    ],
  },
  {
    id: 'c2', name: 'Camp Problema', effectiveStatus: 'DISAPPROVED', objective: 'LEADS', dailyBudget: 0,
    metrics: { spend: 0, results: 0, ctrLink: 0, cpm: 0 }, adsets: [],
  },
]

describe('CampaignTree', () => {
  it('renders campaign rows with status color classes', () => {
    render(<CampaignTree tree={tree} onToggleStatus={() => {}} />)
    expect(screen.getByText('Camp Ativa').closest('[data-status]')).toHaveAttribute('data-status', 'success')
    expect(screen.getByText('Camp Problema').closest('[data-status]')).toHaveAttribute('data-status', 'danger')
  })

  it('expands a campaign to reveal its adsets', async () => {
    render(<CampaignTree tree={tree} onToggleStatus={() => {}} />)
    expect(screen.queryByText('Conjunto 1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expandir Camp Ativa/i }))
    expect(screen.getByText('Conjunto 1')).toBeInTheDocument()
  })

  it('calls onToggleStatus with node info when a switch is toggled', async () => {
    const onToggle = vi.fn()
    render(<CampaignTree tree={tree} onToggleStatus={onToggle} />)
    const row = screen.getByText('Camp Ativa').closest('[data-status]')
    await userEvent.click(within(row).getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith({ level: 'campaign', id: 'c1', name: 'Camp Ativa', nextStatus: 'PAUSED' })
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- CampaignTree`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/CampaignTree.jsx`**

```jsx
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { mapEffectiveStatusToColor, STATUS_ROW_CLASS } from '@/lib/campaignStatus'
import { Switch } from '@/components/ui/Switch'
import { MetricInfo } from '@/components/ui/MetricInfo'

const OBJECTIVE_RESULT_LABEL = {
  LEADS: 'Leads (formulário)',
  APP_PROMOTION: 'Instalações do app',
  OUTCOME_LEADS: 'Leads (formulário)',
  OUTCOME_TRAFFIC: 'Cliques no link',
}

function resultLabel(objective) {
  return OBJECTIVE_RESULT_LABEL[String(objective ?? '').toUpperCase()] || 'Resultados'
}

function isOn(status) {
  return String(status ?? '').toUpperCase() === 'ACTIVE'
}

function NodeMetrics({ node }) {
  const m = node.metrics || {}
  const cpl = m.results > 0 ? m.spend / m.results : null
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[11px] text-foreground">
      <Metric k="invest" v={formatCurrency(Number(m.spend) || 0)} />
      <Metric k="results" label={resultLabel(node.objective)} v={formatNumber(Number(m.results) || 0)} />
      <Metric k="cpl" label="Custo/res." v={cpl != null ? formatCurrency(cpl) : '—'} />
      <Metric k="ctrLink" v={formatPercent(Number(m.ctrLink) || 0)} />
      <Metric k="cpm" v={m.cpm ? formatCurrency(Number(m.cpm)) : '—'} />
    </div>
  )
}

function Metric({ k, label, v }) {
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label || undefined}
        <MetricInfo metricKey={k} size={10} />
      </span>
      <span>{v}</span>
    </div>
  )
}

function Row({ node, level, depth, onToggleStatus, children, hasChildren, expanded, onExpand }) {
  const color = mapEffectiveStatusToColor(node.effectiveStatus)
  const budget = node.dailyBudget ? ` · R$${node.dailyBudget}/dia` : ''
  return (
    <div>
      <div
        data-status={color}
        className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', STATUS_ROW_CLASS[color])}
        style={{ marginLeft: depth * 16 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={`expandir ${node.name}`}
            aria-expanded={expanded}
            onClick={onExpand}
            className="text-muted-foreground transition-transform"
          >
            <ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-[14px]" />
        )}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-xs font-medium text-foreground">{node.name}</p>
            <p className="truncate font-sans text-[10px] text-muted-foreground">
              {String(node.objective ?? '').toUpperCase() || '—'}{budget}
            </p>
          </div>
          <NodeMetrics node={node} />
          <Switch
            size="sm"
            checked={isOn(node.effectiveStatus)}
            aria-label={`Status de ${node.name}`}
            onCheckedChange={(next) =>
              onToggleStatus({ level, id: node.id, name: node.name, nextStatus: next ? 'ACTIVE' : 'PAUSED' })
            }
          />
        </div>
      </div>
      {expanded ? <div className="mt-2 flex flex-col gap-2">{children}</div> : null}
    </div>
  )
}

function AdCard({ ad, onToggleStatus }) {
  const color = mapEffectiveStatusToColor(ad.effectiveStatus)
  const m = ad.metrics || {}
  return (
    <div data-status={color} className={cn('w-56 overflow-hidden rounded-xl border', STATUS_ROW_CLASS[color])}>
      <div className="h-28 w-full bg-muted">
        {ad.thumbnailUrl ? <img src={ad.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-sans text-[11px] font-medium text-foreground">{ad.name}</span>
          <Switch
            size="sm"
            checked={isOn(ad.effectiveStatus)}
            aria-label={`Status de ${ad.name}`}
            onCheckedChange={(next) =>
              onToggleStatus({ level: 'ad', id: ad.id, name: ad.name, nextStatus: next ? 'ACTIVE' : 'PAUSED' })
            }
          />
        </div>
        <div className="flex flex-col gap-1 font-mono text-[10px] text-muted-foreground">
          <span>INVEST · {formatCurrency(Number(m.spend) || 0)}</span>
          <span>{resultLabel(ad.objective)} · {formatNumber(Number(m.results) || 0)}</span>
          <span>CTR LINK · {formatPercent(Number(m.ctrLink) || 0)}</span>
        </div>
      </div>
    </div>
  )
}

function Expandable({ node, level, depth, onToggleStatus }) {
  const [open, setOpen] = useState(false)
  const childAdsets = node.adsets || []
  const childAds = node.ads || []
  const hasChildren = childAdsets.length > 0 || childAds.length > 0
  return (
    <Row
      node={node}
      level={level}
      depth={depth}
      onToggleStatus={onToggleStatus}
      hasChildren={hasChildren}
      expanded={open}
      onExpand={() => setOpen((v) => !v)}
    >
      {childAdsets.map((s) => (
        <Expandable key={s.id} node={s} level="adset" depth={depth + 1} onToggleStatus={onToggleStatus} />
      ))}
      {childAds.length > 0 ? (
        <div className="flex flex-wrap gap-3" style={{ marginLeft: (depth + 1) * 16 }}>
          {childAds.map((ad) => (
            <AdCard key={ad.id} ad={ad} onToggleStatus={onToggleStatus} />
          ))}
        </div>
      ) : null}
    </Row>
  )
}

export function CampaignTree({ tree, onToggleStatus }) {
  const rows = Array.isArray(tree) ? tree : []
  return (
    <div className="flex flex-col gap-2">
      {rows.map((c) => (
        <Expandable key={c.id} node={c} level="campaign" depth={0} onToggleStatus={onToggleStatus} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- CampaignTree`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CampaignTree.jsx src/components/CampaignTree.test.jsx
git commit -m "feat: add hierarchical CampaignTree with status colors"
```

---

## Task 11: Backend — Meta Status Mutate Endpoint

**Files:**
- Create: `functions/api/admin/platform/meta-campaign-status.ts`
- Test: `functions/api/admin/platform/meta-campaign-status.test.ts`

- [ ] **Step 1: Write failing test for the request builder**

```ts
import { describe, it, expect } from 'vitest'
import { buildMetaStatusRequest, normalizeStatus } from './meta-campaign-status'

describe('meta-campaign-status helpers', () => {
  it('normalizes status to ACTIVE/PAUSED only', () => {
    expect(normalizeStatus('active')).toBe('ACTIVE')
    expect(normalizeStatus('PAUSED')).toBe('PAUSED')
    expect(normalizeStatus('garbage')).toBeNull()
  })
  it('builds a graph POST url + body for a node id', () => {
    const { url, body } = buildMetaStatusRequest('123', 'PAUSED', 'TOKEN')
    expect(url).toBe('https://graph.facebook.com/v21.0/123')
    expect(body.get('status')).toBe('PAUSED')
    expect(body.get('access_token')).toBe('TOKEN')
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- meta-campaign-status`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `functions/api/admin/platform/meta-campaign-status.ts`**

```ts
import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { json, jsonError } from '../../../_lib/json'
import { getActiveConnectionForOrg, decryptMetaAccessToken } from '../../../_lib/org-platform-credentials'

export function normalizeStatus(raw: unknown): 'ACTIVE' | 'PAUSED' | null {
  const s = String(raw ?? '').trim().toUpperCase()
  return s === 'ACTIVE' || s === 'PAUSED' ? s : null
}

export function buildMetaStatusRequest(id: string, status: 'ACTIVE' | 'PAUSED', token: string) {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(id)}`
  const body = new URLSearchParams({ status, access_token: token })
  return { url, body }
}

export async function onRequestPost(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  let payload: { orgId?: string; id?: string; status?: string; level?: string }
  try {
    payload = await context.request.json()
  } catch {
    return jsonError('Corpo inválido', 400)
  }

  const orgId = String(payload.orgId ?? '').trim()
  const id = String(payload.id ?? '').trim()
  const status = normalizeStatus(payload.status)
  if (!orgId || !id || !status) return jsonError('Parâmetros obrigatórios: orgId, id, status (ACTIVE|PAUSED)', 400)

  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'meta_ads')
  if (!conn) return jsonError('Nenhuma conta Meta ligada a esta organização', 404)

  const token = await decryptMetaAccessToken(context.env.DB, context.env, conn.oauth_credential_id)
  if (!token) return jsonError('Token Meta indisponível. Reconecte em Integrações.', 409)

  const { url, body } = buildMetaStatusRequest(id, status, token)
  const res = await fetch(url, { method: 'POST', body })
  const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } }

  if (!res.ok || data.error) {
    const msg = data.error?.message || `Graph API (${res.status})`
    // Token lacking ads_management surfaces here — message is passed to the UI for rollback.
    return jsonError(msg, 502)
  }

  return json({ ok: true, id, status })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- meta-campaign-status`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/platform/meta-campaign-status.ts functions/api/admin/platform/meta-campaign-status.test.ts
git commit -m "feat: add Meta campaign status mutate endpoint"
```

---

## Task 12: Optimistic Mutation Hook + Confirm Dialog

**Files:**
- Create: `src/hooks/useCampaignStatusMutation.js`
- Create: `src/components/ui/ConfirmDialog.jsx`
- Test: `src/hooks/useCampaignStatusMutation.test.js`

- [ ] **Step 1: Write failing test `src/hooks/useCampaignStatusMutation.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCampaignStatusMutation } from './useCampaignStatusMutation'

describe('useCampaignStatusMutation', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('POSTs and resolves ok on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const { result } = renderHook(() => useCampaignStatusMutation('org1'))
    let ok
    await act(async () => { ok = await result.current.mutate({ level: 'campaign', id: 'c1', nextStatus: 'PAUSED' }) })
    expect(ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/platform/meta-campaign-status',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('resolves false and exposes error on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'sem ads_management' }) })
    const { result } = renderHook(() => useCampaignStatusMutation('org1'))
    let ok
    await act(async () => { ok = await result.current.mutate({ level: 'campaign', id: 'c1', nextStatus: 'PAUSED' }) })
    expect(ok).toBe(false)
    expect(result.current.error).toMatch(/ads_management/)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- useCampaignStatusMutation`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/hooks/useCampaignStatusMutation.js`**

```js
import { useState, useCallback } from 'react'

/** POST status change to the Meta mutate endpoint. Returns boolean ok; exposes error message. */
export function useCampaignStatusMutation(orgId) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async ({ level, id, nextStatus }) => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/platform/meta-campaign-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, level, id, status: nextStatus }),
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
    [orgId]
  )

  return { mutate, pending, error }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- useCampaignStatusMutation`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/components/ui/ConfirmDialog.jsx`**

```jsx
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

/** Confirmation for live, irreversible actions (pausing/activating a running campaign). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', onConfirm, destructive = false }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border bg-surface-card p-6 shadow-2xl">
          <Dialog.Title className="font-display text-sm font-semibold text-foreground">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-xs text-muted-foreground">{description}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="rounded-md border border-surface-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover">
              Cancelar
            </Dialog.Close>
            <button
              type="button"
              onClick={() => { onConfirm(); onOpenChange(false) }}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold',
                destructive ? 'bg-danger text-white hover:bg-danger/90' : 'bg-brand text-[#0F0F0F] hover:bg-brand/90'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCampaignStatusMutation.js src/hooks/useCampaignStatusMutation.test.js src/components/ui/ConfirmDialog.jsx
git commit -m "feat: add status mutation hook + confirm dialog"
```

---

## Task 13: Wire CampaignTree into MetaAds (remove mock, BlockCard, dictionary)

**Files:**
- Modify: `src/pages/MetaAds.jsx`

- [ ] **Step 1: Replace `MetaCampaignsTable` block with a tree-backed block**

In `src/pages/MetaAds.jsx`, add imports:
```jsx
import { CampaignTree } from '@/components/CampaignTree'
import { BlockCard } from '@/components/ui/BlockCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCampaignStatusMutation } from '@/hooks/useCampaignStatusMutation'
```

Replace the `MetaCampaignsTable` function body with a tree consumer that reads `data.tree`, manages optimistic state, shows the confirm dialog before mutating, and rolls back on failure:

```jsx
function MetaCampaignsBlock() {
  const { activeOrgId } = useOrgWorkspace()
  const { loading, data } = usePlatformOverview()
  const { mutate } = useCampaignStatusMutation(activeOrgId)
  const [tree, setTree] = useState([])
  const [pendingToggle, setPendingToggle] = useState(null) // { level, id, name, nextStatus }

  useEffect(() => { setTree(Array.isArray(data?.tree) ? data.tree : []) }, [data?.tree])

  const applyStatus = (node, status) => {
    const patch = (list) =>
      list.map((c) => ({
        ...c,
        effectiveStatus: c.id === node.id && node.level === 'campaign' ? status : c.effectiveStatus,
        adsets: (c.adsets || []).map((s) => ({
          ...s,
          effectiveStatus: s.id === node.id && node.level === 'adset' ? status : s.effectiveStatus,
          ads: (s.ads || []).map((a) => ({
            ...a,
            effectiveStatus: a.id === node.id && node.level === 'ad' ? status : a.effectiveStatus,
          })),
        })),
      }))
    setTree(patch)
  }

  const onConfirmToggle = async () => {
    const node = pendingToggle
    if (!node) return
    const prevStatus = node.nextStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    applyStatus(node, node.nextStatus) // optimistic
    const ok = await mutate(node)
    if (!ok) applyStatus(node, prevStatus) // rollback
  }

  const state = loading ? 'loading' : data?.campaignsError ? 'error' : tree.length === 0 ? 'empty' : 'ready'
  const activeCount = tree.filter((c) => String(c.effectiveStatus).toUpperCase() === 'ACTIVE').length

  return (
    <BlockCard
      title="Campanhas Meta Ads"
      badge={`${activeCount} ativas · ${tree.length} campanhas`}
      state={state}
      emptyMessage="Nenhuma campanha no período."
      errorMessage={String(data?.campaignsError || '')}
      bodyClassName="overflow-auto"
    >
      <CampaignTree
        tree={tree}
        onToggleStatus={(node) => setPendingToggle(node)}
      />
      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(o) => { if (!o) setPendingToggle(null) }}
        title={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar campanha?' : 'Ativar campanha?'}
        description={`Isso afeta a entrega ao vivo de "${pendingToggle?.name ?? ''}".`}
        confirmLabel={pendingToggle?.nextStatus === 'PAUSED' ? 'Pausar' : 'Ativar'}
        destructive={pendingToggle?.nextStatus === 'PAUSED'}
        onConfirm={onConfirmToggle}
      />
    </BlockCard>
  )
}
```

Add `useEffect` to the React import at the top: `import { useMemo, useState, useEffect } from 'react'`.

Update `buildMetaDefinitions` so `meta-campaigns` renders `<MetaCampaignsBlock />` instead of `<MetaCampaignsTable />`.

- [ ] **Step 2: Remove mock-data blocks**

Delete the `videoMetrics`, `engMetrics`, and `META_CREATIVES_MOCK` constants and the `MetaVideoRetention` / `MetaEngagement` components. For `MetaCreativesCarouselBlock`, change `baseCards` to use only real data and render `empty` when absent:
```jsx
const baseCards = useMemo(() => {
  const c = data?.creatives
  return Array.isArray(c) ? c.map(normaliseMetaCreativeRow) : []
}, [data?.creatives])
```
Remove `meta-video` and `meta-engagement` entries from `buildMetaDefinitions` (their data was never real). If video retention is desired later, it returns as a real-data block in a follow-up.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `vite build` succeeds with no missing-import errors.

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MetaAds.jsx
git commit -m "feat: wire CampaignTree into Meta Ads, remove mock blocks"
```

---

## Task 14: Layout Order + Background Polish

**Files:**
- Modify: `src/index.css` (`.dashboard-area-bg`, ~line 92)
- Modify: `src/pages/MetaAds.jsx` (`buildMetaDefinitions` ordering)

- [ ] **Step 1: Soften the dashboard background**

In `src/index.css`, in `.dashboard-area-bg`, reduce the radial intensity:
```css
      radial-gradient(circle at 50% 58%, rgba(236, 72, 153, 0.06) 0%, rgba(168, 85, 247, 0.03) 40%, transparent 70%);
```
(lower alphas from `0.12`/`0.055` to `0.06`/`0.03`).

- [ ] **Step 2: Ensure default block order is KPIs → charts → tree**

In `buildMetaDefinitions`, confirm the returned array order is: KPI blocks (primary) first, then `meta-daily` + `meta-placements`, then `meta-funnel`, then `meta-creatives`, then `meta-campaigns` (tree), then `meta-monthly-results`. Reorder the array literal to match (move `meta-campaigns` above `meta-monthly-results`; it already is). No KPI tier change needed.

- [ ] **Step 3: Verify build + manual check**

Run: `npm run build`
Then: `npm run dev`, open Meta Ads, confirm: KPIs on top, no fake 12.99% video block, campaign tree at bottom with colored borders + switches, `(i)` tooltips on metric labels.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/pages/MetaAds.jsx
git commit -m "style: soften dashboard background, confirm block order"
```

---

## Self-Review Notes

- **Spec coverage:** tokens (T1), dictionary (T2), Switch (T3), MetricInfo (T4), BlockState (T5), BlockCard (T6), status color (T7), tree assembly (T8/T9), CampaignTree (T10), Meta mutate endpoint (T11), optimistic + confirm (T12), MetaAds refactor + mock removal (T13), layout/background (T14). All SP1 spec sections map to a task.
- **Functional switch caveat:** T11 returns the Graph error to the UI; if the token lacks `ads_management` (current "Application has been deleted" state), the optimistic toggle rolls back and surfaces the message — as designed. No code change unblocks the live mutation until the token is renewed (out of SP1 scope).
- **Google switch:** explicitly SP2, not in this plan.
- **Type/name consistency:** `mapEffectiveStatusToColor` + `STATUS_COLOR`/`STATUS_ROW_CLASS` (T7) used by CampaignTree (T10). `buildMetaTree` types (T8) consumed by T9. `useCampaignStatusMutation.mutate({ level, id, nextStatus })` shape (T12) matches `onToggleStatus` payload from CampaignTree (T10) and the endpoint body (T11).
