import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatNumber } from '@/lib/utils'

const COLORS = ['#4285F4', '#34A853', '#F5C518', '#9B8EFF', '#f97316', '#22d3ee']

function formatConvCount(n) {
  const x = Number(n) || 0
  const hasFrac = Math.abs(x % 1) > 1e-6
  return hasFrac
    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x)
    : formatNumber(Math.round(x))
}

function MixTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs shadow-xl">
      <p className="font-sans text-white">{row.name}</p>
      <p className="font-mono text-muted-foreground">
        {formatConvCount(row.value)} conv. · {row.pct}%
      </p>
    </div>
  )
}

export default function GoogleConversionMixChart({ breakdown }) {
  const chartData = useMemo(() => {
    const primary = Array.isArray(breakdown?.primary) ? breakdown.primary : []
    const secondary = Array.isArray(breakdown?.secondary) ? breakdown.secondary : []
    const all = [
      ...primary.map((r) => ({ name: r.name || r.id, value: Number(r.conversions) || 0, group: 'primary' })),
      ...secondary.map((r) => ({ name: r.name || r.id, value: Number(r.conversions) || 0, group: 'secondary' })),
    ].filter((r) => r.value > 0)
    const total = all.reduce((s, r) => s + r.value, 0)
    return all.map((r) => ({
      ...r,
      pct: total > 0 ? Math.round((r.value / total) * 100) : 0,
    }))
  }, [breakdown])

  const total = chartData.reduce((s, r) => s + r.value, 0)

  if (chartData.length === 0) {
    return (
      <div className="google-mix-chart google-mix-chart--empty">
        <p className="text-[11px] text-muted-foreground font-sans">Sem conversões no período para distribuição.</p>
      </div>
    )
  }

  return (
    <div className="google-mix-chart">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Mix de conversões
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground/75 font-sans">Por tipo de ação</p>
        </div>
        <p className="font-mono text-lg font-bold tabular-nums text-foreground">{formatConvCount(total)}</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="mx-auto h-[140px] w-[140px] shrink-0 sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="transparent"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<MixTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {chartData.slice(0, 6).map((row, i) => (
            <li key={`${row.name}-${i}`} className="flex items-center gap-2 text-[11px]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-sans text-foreground" title={row.name}>
                {row.name}
              </span>
              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{row.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
