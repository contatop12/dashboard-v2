import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

const PERIODS = [
  { label: '1D', value: '1d', pts: 24, stepMs: 3_600_000 },
  { label: '1S', value: '1w', pts: 7, stepMs: 86_400_000 },
  { label: '1M', value: '1m', pts: 30, stepMs: 86_400_000 },
  { label: '3M', value: '3m', pts: 90, stepMs: 86_400_000 },
  { label: '1A', value: '1y', pts: 365, stepMs: 86_400_000 },
]

function generateData(pts) {
  const base = 1302 / pts
  return Array.from({ length: pts }, (_, i) => ({
    i,
    gasto: Math.max(0, base + (Math.random() - 0.35) * 80 + Math.sin(i * 0.3) * 25),
  }))
}

const channels = [
  {
    name: 'Meta Ads',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
        <path d="M16.927 8.026h-2.945a1.9 1.9 0 0 0-1.9 1.886l-.086 11.515m-1.914-7.425h4.803" />
      </svg>
    ),
    amount: 680,
    change: '+12,4%',
    isPos: true,
    color: '#4A9BFF',
  },
  {
    name: 'Google Ads',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    amount: 420,
    change: '-3,2%',
    isPos: false,
    color: '#34A853',
  },
  {
    name: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
        <path d="M16.5 12a4.5 4.5 0 1 1-9 0a4.5 4.5 0 0 1 9 0m1.008-5.5h-.01" />
      </svg>
    ),
    amount: 202,
    change: '+8,1%',
    isPos: true,
    color: '#E1306C',
  },
]

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function InvestimentoChart() {
  const [period, setPeriod] = useState('1m')
  const periodDef = PERIODS.find(p => p.value === period)
  const data = useMemo(() => generateData(periodDef.pts), [period])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex flex-wrap shrink-0 items-center justify-between gap-2">
        <span className="section-title">Investimento Total</span>
        <button className="text-[10px] px-2 py-2 rounded-md bg-surface-hover border border-surface-border text-muted-foreground hover:text-white transition-colors font-sans">
          Relatório
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl font-mono font-medium tracking-tight">R$1,30mil</span>
        <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
          +12%
        </span>
      </div>

      {/* Period selector */}
      <div className="flex border border-surface-border rounded-lg overflow-hidden divide-x divide-surface-border">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'flex-1 h-6 text-[11px] font-semibold font-mono tracking-tight transition-colors',
              period === p.value
                ? 'bg-surface-hover text-white'
                : 'bg-transparent text-muted-foreground hover:bg-surface-hover/50'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Line chart */}
      <div className="flex min-h-[7rem] w-full flex-1 flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgb(var(--color-border))" />
            <XAxis dataKey="i" hide />
            <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
            <Tooltip
              cursor={{ stroke: 'rgb(var(--color-brand))', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-surface-card border border-surface-border rounded-lg px-2 py-2 text-xs shadow-xl">
                    <span className="font-mono text-brand font-semibold">
                      {fmt.format(payload[0].value)}
                    </span>
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

      {/* Channel breakdown */}
      <div className="flex min-h-0 shrink-0 flex-col gap-2 border-t border-surface-border pt-1">
        {channels.map(({ name, icon, amount, change, isPos, color }) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color }}>
              {icon}
              <span className="text-[11px] font-sans text-muted-foreground">{name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono font-medium text-white">{fmt.format(amount)}</span>
              <div className="flex items-center gap-1 w-14 justify-end">
                {isPos
                  ? <TrendingUp size={10} className="text-green-400" />
                  : <TrendingDown size={10} className="text-red-400" />}
                <span className={cn('text-[10px] font-mono', isPos ? 'text-green-400' : 'text-red-400')}>
                  {change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
