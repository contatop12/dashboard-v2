import { useMemo, useState } from 'react'
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

const SORT_OPTIONS = [
  { id: 'spend', label: 'Maior gasto' },
  { id: 'results', label: 'Mais resultados' },
  { id: 'name', label: 'Nome (A–Z)' },
]

const DEFAULT_LABELS = { adsets: 'Conjuntos', ads: 'Anúncios', keywords: 'Palavras-chave' }

const MATCH_TYPE_LABELS = {
  BROAD: 'Ampla',
  PHRASE: 'Frase',
  EXACT: 'Exata',
}

function isSearchObjective(objective) {
  return String(objective ?? '').toUpperCase() === 'SEARCH'
}

function resultLabel(objective, resultsLabel) {
  if (resultsLabel) return resultsLabel
  return OBJECTIVE_RESULT_LABEL[String(objective ?? '').toUpperCase()] || 'Resultados'
}

function isOn(status) {
  return String(status ?? '').toUpperCase() === 'ACTIVE'
}

function sortNodes(items, sortId) {
  const list = [...(items || [])]
  if (sortId === 'name') {
    return list.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), 'pt-BR'))
  }
  if (sortId === 'results') {
    return list.sort((a, b) => (Number(b.metrics?.results) || 0) - (Number(a.metrics?.results) || 0))
  }
  return list.sort((a, b) => (Number(b.metrics?.spend) || 0) - (Number(a.metrics?.spend) || 0))
}

function NodeMetrics({ node, compact = false, resultsLabel = null, searchMode = false }) {
  const m = node.metrics || {}
  const cpl = m.results > 0 ? m.spend / m.results : null
  const rl = resultLabel(node.objective, resultsLabel)
  if (searchMode) {
    return (
      <div
        className={cn(
          'grid shrink-0 gap-x-4 gap-y-1 font-mono text-[11px] text-foreground',
          compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        )}
      >
        <Metric k="invest" label={compact ? 'Investimento' : 'Invest.'} v={formatCurrency(Number(m.spend) || 0)} />
        <Metric k="impressions" label={compact ? 'Impressões' : 'Impr.'} v={formatNumber(Number(m.impressions) || 0)} />
        <Metric k="clicks" label="Cliques" v={formatNumber(Number(m.clicks) || 0)} />
        {!compact && (
          <Metric k="results" label={rl.replace(' (formulário)', ' (form.)')} v={formatNumber(Number(m.results) || 0)} />
        )}
        <Metric k="ctrLink" label="CTR link" v={formatPercent(Number(m.ctrLink) || 0)} />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'grid shrink-0 gap-x-4 gap-y-1 font-mono text-[11px] text-foreground',
        compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      )}
    >
      <Metric k="invest" label={compact ? 'Investimento' : 'Invest.'} v={formatCurrency(Number(m.spend) || 0)} />
      <Metric k="results" label={compact ? rl : rl.replace(' (formulário)', ' (form.)')} v={formatNumber(Number(m.results) || 0)} />
      {!compact && (
        <Metric k="cpl" label="Custo/res." v={cpl != null ? formatCurrency(cpl) : '—'} />
      )}
      <Metric k="ctrLink" label="CTR link" v={formatPercent(Number(m.ctrLink) || 0)} />
      {!compact && <Metric k="cpm" label="CPM" v={m.cpm ? formatCurrency(Number(m.cpm)) : '—'} />}
    </div>
  )
}

function Metric({ k, label, v }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col">
      <span className="flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        <MetricInfo metricKey={k} size={10} />
      </span>
      <span className="truncate">{v}</span>
    </div>
  )
}

function SortSelect({ value, onChange, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'rounded border border-surface-border bg-surface-input px-2 py-1 font-sans text-[10px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        className
      )}
      aria-label="Ordenar"
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SectionHeader({ title, count, sort, onSortChange }) {
  return (
    <div className="mb-2 mt-3 flex items-center justify-between gap-2 first:mt-1">
      <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        {count != null ? `${title} (${count})` : title}
      </span>
      <SortSelect value={sort} onChange={onSortChange} />
    </div>
  )
}

function EntityRow({ node, level, onToggleStatus, hasChildren, expanded, onExpand, resultsLabel, searchMode = false }) {
  const color = mapEffectiveStatusToColor(node.effectiveStatus)
  const budget = node.dailyBudget ? `R$ ${Number(node.dailyBudget).toFixed(2).replace('.', ',')}/dia` : null
  const objective = String(node.objective ?? '').toUpperCase() || '—'

  return (
    <div
      data-status={color}
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4',
        STATUS_ROW_CLASS[color]
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {hasChildren ? (
          <button
            type="button"
            aria-label={`expandir ${node.name}`}
            aria-expanded={expanded}
            onClick={onExpand}
            className="shrink-0 text-muted-foreground transition-transform hover:text-foreground"
          >
            <ChevronRight size={14} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-xs font-medium text-foreground">{node.name}</p>
          <p className="truncate font-sans text-[10px] text-muted-foreground">
            {level === 'adset' && budget ? (
              <>
                <span className="text-foreground/80">{budget}</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {objective}
              </>
            ) : (
              <>
                {objective}
                {budget ? ` · ${budget}` : ''}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <NodeMetrics node={node} resultsLabel={resultsLabel} searchMode={searchMode} />
        <Switch
          size="sm"
          checked={isOn(node.effectiveStatus)}
          aria-label={`Status de ${node.name}`}
          onCheckedChange={(next) =>
            onToggleStatus({
              level,
              id: node.id,
              name: node.name,
              nextStatus: next ? 'ACTIVE' : 'PAUSED',
            })
          }
        />
      </div>
    </div>
  )
}

function KeywordRow({ kw, searchMode = true }) {
  const match = MATCH_TYPE_LABELS[String(kw.matchType || '').toUpperCase()]
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-sans text-xs font-medium text-foreground" title={kw.keyword}>
            {kw.keyword}
          </p>
          {match ? (
            <span className="shrink-0 rounded bg-white/[0.06] px-1 py-px text-[8px] uppercase tracking-wide text-muted-foreground">
              {match}
            </span>
          ) : null}
        </div>
      </div>
      <NodeMetrics node={kw} compact searchMode={searchMode} />
    </div>
  )
}

function AdCard({ ad, onToggleStatus, resultsLabel, searchMode = false }) {
  const color = mapEffectiveStatusToColor(ad.effectiveStatus)
  return (
    <div
      data-status={color}
      className={cn(
        'w-[11.5rem] shrink-0 overflow-hidden rounded-lg border sm:w-[12.5rem]',
        STATUS_ROW_CLASS[color]
      )}
    >
      <div className="aspect-[4/3] w-full bg-surface-hover">
        {ad.thumbnailUrl ? (
          <img src={ad.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            Sem preview
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 font-sans text-[11px] font-medium leading-snug text-foreground">
            {ad.name}
          </span>
          <Switch
            size="sm"
            checked={isOn(ad.effectiveStatus)}
            aria-label={`Status de ${ad.name}`}
            onCheckedChange={(next) =>
              onToggleStatus({
                level: 'ad',
                id: ad.id,
                name: ad.name,
                nextStatus: next ? 'ACTIVE' : 'PAUSED',
              })
            }
          />
        </div>
        <NodeMetrics node={ad} compact resultsLabel={resultsLabel} searchMode={searchMode} />
      </div>
    </div>
  )
}

function AdsetBlock({ adset, onToggleStatus, labels, resultsLabel, searchMode = false }) {
  const [open, setOpen] = useState(true)
  const [adSort, setAdSort] = useState('spend')
  const [kwOpen, setKwOpen] = useState(true)
  const ads = useMemo(() => sortNodes(adset.ads, adSort), [adset.ads, adSort])
  const keywords = useMemo(
    () => (Array.isArray(adset.keywords) ? adset.keywords : []),
    [adset.keywords]
  )
  const hasAds = ads.length > 0
  const hasKeywords = searchMode && keywords.length > 0
  const hasChildren = hasAds || hasKeywords

  return (
    <div className="flex flex-col gap-2">
      <EntityRow
        node={adset}
        level="adset"
        onToggleStatus={onToggleStatus}
        hasChildren={hasChildren}
        expanded={open}
        onExpand={() => setOpen((v) => !v)}
        resultsLabel={resultsLabel}
        searchMode={searchMode}
      />
      {open && hasKeywords ? (
        <div className="ml-2 border-l border-white/[0.06] pl-3">
          <div className="mb-2 mt-1 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-expanded={kwOpen}
              onClick={() => setKwOpen((v) => !v)}
              className="flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 hover:text-muted-foreground"
            >
              <ChevronRight size={12} className={cn('transition-transform', kwOpen && 'rotate-90')} />
              {labels.keywords} ({keywords.length})
            </button>
          </div>
          {kwOpen ? (
            <div className="flex flex-col gap-2">
              {keywords.map((kw) => (
                <KeywordRow key={kw.id} kw={kw} searchMode={searchMode} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {open && hasAds ? (
        <div className="ml-2 border-l border-white/[0.06] pl-3">
          <SectionHeader title={labels.ads} count={ads.length} sort={adSort} onSortChange={setAdSort} />
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} onToggleStatus={onToggleStatus} resultsLabel={resultsLabel} searchMode={searchMode} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CampaignBlock({ campaign, onToggleStatus, labels, resultsLabel, searchMode = false }) {
  const [open, setOpen] = useState(false)
  const [adsetSort, setAdsetSort] = useState('spend')
  const adsets = useMemo(() => sortNodes(campaign.adsets, adsetSort), [campaign.adsets, adsetSort])
  const hasAdsets = adsets.length > 0
  const isSearch = searchMode || isSearchObjective(campaign.objective)

  return (
    <div className="flex flex-col gap-2">
      <EntityRow
        node={campaign}
        level="campaign"
        onToggleStatus={onToggleStatus}
        hasChildren={hasAdsets}
        expanded={open}
        onExpand={() => setOpen((v) => !v)}
        resultsLabel={resultsLabel}
        searchMode={isSearch}
      />
      {open && hasAdsets ? (
        <div className="ml-2 border-l border-white/[0.06] pl-3">
          <SectionHeader title={labels.adsets} sort={adsetSort} onSortChange={setAdsetSort} />
          <div className="flex flex-col gap-3">
            {adsets.map((adset) => (
              <AdsetBlock
                key={adset.id}
                adset={adset}
                onToggleStatus={onToggleStatus}
                labels={labels}
                resultsLabel={resultsLabel}
                searchMode={isSearch}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CampaignTree({ tree, onToggleStatus, labels = DEFAULT_LABELS, resultsLabel = null, platform = null }) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels }
  const searchMode = platform === 'google'
  const rows = Array.isArray(tree) ? tree : []
  return (
    <div className="flex flex-col gap-4">
      {rows.map((c) => (
        <CampaignBlock
          key={c.id}
          campaign={c}
          onToggleStatus={onToggleStatus}
          labels={mergedLabels}
          resultsLabel={resultsLabel}
          searchMode={searchMode}
        />
      ))}
    </div>
  )
}
