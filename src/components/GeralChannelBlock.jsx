import { useMemo } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { BlockCard } from '@/components/ui/BlockCard'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'
import { selectGeralDaily } from '@/lib/geralOverviewMetrics'

const CHANNEL_COLORS = {
  meta_ads: '#1877F2',
  google_ads: '#34A853',
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GeralChannelBlock() {
  const { loading, data } = usePlatformOverview()
  const daily = useMemo(() => selectGeralDaily(data, false), [data])
  const channels = Array.isArray(data?.channels) ? data.channels : []
  const total = channels.reduce((s, c) => s + (Number(c.spend) || 0), 0)

  const chartData = useMemo(
    () =>
      daily.map((d, i) => ({
        i,
        gasto: Number(d.spend) || 0,
        meta: Number(d.metaSpend) || 0,
        google: Number(d.googleSpend) || 0,
        label: d.date,
      })),
    [daily]
  )

  return (
    <BlockCard
      title="Investimento por canal"
      badge={loading ? '…' : fmt.format(total)}
      bodyClassName="flex flex-col gap-4"
      state={loading ? 'loading' : channels.length === 0 ? 'empty' : 'ready'}
      emptyMessage="Sem gasto por canal no período selecionado."
    >
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="i" hide />
            <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--color-brand))', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="rounded-lg border border-surface-border bg-surface-card px-2 py-2 text-xs shadow-xl">
                    <span className="font-mono font-semibold text-brand">{fmt.format(payload[0].value)}</span>
                  </div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="gasto"
              stroke="rgb(var(--color-brand))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'rgb(var(--color-brand))', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
        {channels.map(({ id, name, spend, results }) => {
          const amount = Number(spend) || 0
          const share = total > 0 ? (amount / total) * 100 : 0
          const color = CHANNEL_COLORS[id] ?? '#F5C518'
          return (
            <div key={id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-[11px] font-sans text-foreground">{name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] font-medium text-white">{fmt.format(amount)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{share.toFixed(0)}%</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{results ?? 0} res.</span>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${share}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </BlockCard>
  )
}
