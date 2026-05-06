import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { timelineData } from '@/data/mockData'
import { cn } from '@/lib/utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg px-4 py-2 text-xs shadow-xl">
      <p className="font-sans text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono text-white font-semibold">
            {p.name === 'Custo/Lead' ? `R$${p.value.toFixed(2)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const periods = ['7D', '14D', '30D', '90D']

export default function TimelineChart() {
  const [activePeriod, setActivePeriod] = useState('30D')

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Linha de Tempo</span>
        <div className="flex items-center gap-2">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setActivePeriod(p)}
              className={cn(
                'text-[10px] px-2 py-1 rounded font-mono transition-all',
                activePeriod === p
                  ? 'bg-brand text-[#0F0F0F] font-semibold'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-4 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-brand" />
          <span className="text-muted-foreground font-sans">Leads (TOTAL)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-purple-accent border-dashed" />
          <span className="text-muted-foreground font-sans">Custo por Lead</span>
        </div>
      </div>

      <div className="flex min-h-[12rem] w-full flex-1 flex-col overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timelineData} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F5C518" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#F5C518" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="leads"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="custo"
              orientation="right"
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              yAxisId="leads"
              type="monotone"
              dataKey="leads"
              name="Leads"
              stroke="#F5C518"
              strokeWidth={2}
              fill="url(#leadsGradient)"
              dot={false}
              activeDot={{ r: 3, fill: '#F5C518', strokeWidth: 0 }}
            />
            <Line
              yAxisId="custo"
              type="monotone"
              dataKey="custo"
              name="Custo/Lead"
              stroke="#9B8EFF"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: '#9B8EFF', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
