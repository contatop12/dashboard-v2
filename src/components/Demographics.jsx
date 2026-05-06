import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts'

const byState = [
  { name: 'São Paulo', value: 45, color: '#F5C518' },
  { name: 'Rio de Janeiro', value: 22, color: '#9B8EFF' },
  { name: 'Minas Gerais', value: 18, color: '#4A9BFF' },
  { name: 'Brasília', value: 15, color: '#FF6B6B' },
]

const byDevice = [
  { name: 'Mobile', value: 68, color: '#F5C518' },
  { name: 'Desktop', value: 24, color: '#9B8EFF' },
  { name: 'Tablet', value: 8, color: '#4A9BFF' },
]

const byGender = [
  { name: 'Masculino', value: 62, color: '#4A9BFF' },
  { name: 'Feminino', value: 35, color: '#FF6B6B' },
  { name: 'Não inf.', value: 3, color: '#888888' },
]

const VIEWS = [
  { key: 'state', label: 'Estado', data: byState },
  { key: 'device', label: 'Dispositivo', data: byDevice },
  { key: 'gender', label: 'Gênero', data: byGender },
]

/** Destaque no hover: pouca expansão para não estourar o SVG (evita cortar nas bordas) */
function ActiveShape({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload }) {
  const bump = Math.min(4, outerRadius * 0.06)
  const haloOuter = outerRadius + bump + 2
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" style={{ fill: '#fff', fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600 }}>
        {payload.value}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" style={{ fill: '#888', fontFamily: 'Outfit', fontSize: 9 }}>
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + bump}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={3}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + bump}
        outerRadius={haloOuter}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
    </g>
  )
}

function DefaultShape({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }) {
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={2}
    />
  )
}

/** Margem interna do SVG para anel ativo / labels não cliparem em overflow-hidden ancestrais */
const PIE_MARGIN = { top: 18, right: 18, bottom: 18, left: 18 }

export default function Demographics() {
  const [view, setView] = useState('state')
  const [activeIdx, setActiveIdx] = useState(0)

  const current = VIEWS.find(v => v.key === view)
  const data = current.data

  return (
    <div className="flex min-h-0 min-w-0 h-full flex-col gap-4 rounded-lg border border-surface-border bg-surface-card p-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <span className="section-title">Demográficos</span>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                setView(v.key)
                setActiveIdx(0)
              }}
              className={`rounded px-2 py-1 font-sans text-[9px] transition-all ${view === v.key ? 'bg-brand/15 text-brand ring-1 ring-brand/35' : 'text-muted-foreground hover:text-white'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch gap-4 overflow-x-hidden">
        <div className="flex min-h-0 w-full shrink-0 flex-col items-center justify-center px-1">
          <div className="relative aspect-square max-h-[min(52vh,340px)] w-full min-h-[148px] max-w-[260px] min-w-0 overflow-visible">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={PIE_MARGIN}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="38%"
                  outerRadius="72%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                  activeIndex={activeIdx}
                  activeShape={ActiveShape}
                  inactiveShape={DefaultShape}
                  onMouseEnter={(_, idx) => setActiveIdx(idx)}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]
                    return (
                      <div className="rounded-lg border border-surface-border bg-surface-card px-2.5 py-1.5 text-xs shadow-xl">
                        <span className="font-sans text-muted-foreground">{d.name}: </span>
                        <span className="font-mono font-semibold text-white">{d.value}%</span>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-x-hidden">
          {data.map((item, i) => (
            <div
              key={item.name}
              className="flex cursor-pointer flex-col gap-1"
              onMouseEnter={() => setActiveIdx(i)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="max-w-[min(100%,12rem)] truncate font-sans text-[10px] text-muted-foreground">{item.name}</span>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-white">{item.value}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface-border">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.value}%`, background: item.color, opacity: activeIdx === i ? 1 : 0.45 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
