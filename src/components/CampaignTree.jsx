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
