import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { BlockCard } from '@/components/ui/BlockCard'

const PERIODS = [
  { label: '1S', value: '1w', pts: 7 },
  { label: '1M', value: '1m', pts: 30 },
  { label: '3M', value: '3m', pts: 90 },
]

const CHANNELS = [
  { name: 'Meta Ads', amount: 680, change: 12.4, color: '#1877F2' },
  { name: 'Google Ads', amount: 420, change: -3.2, color: '#34A853' },
  { name: 'Instagram', amount: 202, change: 8.1, color: '#E1306C' },
]

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function generateData(pts) {
  const base = 1300 / pts
  return Array.from({ length: pts }, (_, i) => ({
    i,
    gasto: Math.max(0, base + Math.sin(i * 0.35) * 25 + (i % 3) * 4),
  }))
}

export default function GeralChannelBlock() {
  const [period, setPeriod] = useState('1m')
  const periodDef = PERIODS.find((p) => p.value === period) ?? PERIODS[1]
  const data = useMemo(() => generateData(periodDef.pts), [periodDef.pts])
  const total = CHANNELS.reduce((s, c) => s + c.amount, 0)

  const periodTabs = (
    <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-[#141414] p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => setPeriod(p.value)}
          className={cn(
            'rounded-md px-2 py-1 text-[9px] font-medium font-sans transition-colors',
            period === p.value
              ? 'bg-brand/20 text-brand ring-1 ring-brand/30'
              : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )

  return (
    <BlockCard
      title="Investimento por canal"
      badge={fmt.format(total)}
      actions={periodTabs}
      bodyClassName="flex flex-col gap-4"
    >
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
        {CHANNELS.map(({ name, amount, change, color }) => {
          const share = total > 0 ? (amount / total) * 100 : 0
          const isPos = change >= 0
          return (
            <div key={name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-[11px] font-sans text-foreground">{name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-[11px] font-medium text-white">{fmt.format(amount)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{share.toFixed(0)}%</span>
                  <div className="flex w-14 items-center justify-end gap-0.5">
                    {isPos ? (
                      <TrendingUp size={10} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={10} className="text-red-400" />
                    )}
                    <span className={cn('font-mono text-[10px]', isPos ? 'text-emerald-400' : 'text-red-400')}>
                      {isPos ? '+' : ''}
                      {change.toFixed(1)}%
                    </span>
                  </div>
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
