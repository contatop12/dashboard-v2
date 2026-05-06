import { useState } from 'react'
import { FunnelChart } from './FunnelChart'
import { funnelData } from '@/data/mockData'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ORIENTATIONS = ['horizontal', 'vertical']

export default function FunnelGeral() {
  const [orientation, setOrientation] = useState('horizontal')
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const chartData = funnelData.map((s, i) => ({
    label: s.label,
    value: s.value,
    displayValue: formatNumber(s.value),
    gradient: [
      { offset: 0, color: `rgba(245,197,24,${1 - i * 0.1})` },
      { offset: 1, color: `rgba(245,197,24,${0.6 - i * 0.07})` },
    ],
  }))

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between shrink-0">
        <span className="section-title">Funil Geral</span>
        <div className="flex items-center gap-2">
          <button className="text-[10px] px-2 py-0.5 rounded bg-brand/15 text-brand border border-brand/20 font-mono">
            E-Commerce
          </button>
          <div className="flex items-center bg-surface-input rounded-md p-0.5">
            {ORIENTATIONS.map((o) => (
              <button
                key={o}
                onClick={() => setOrientation(o)}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded font-mono transition-all',
                  orientation === o ? 'bg-brand text-[#0F0F0F] font-semibold' : 'text-muted-foreground hover:text-white'
                )}
              >
                {o === 'horizontal' ? '↔' : '↕'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <FunnelChart
          data={chartData}
          orientation={orientation}
          layers={4}
          staggerDelay={0.1}
          gap={6}
          showLabels
          showValues
          showPercentage
          hoveredIndex={hoveredIndex}
          onHoverChange={setHoveredIndex}
          edges="curved"
          className="w-full"
          style={orientation === 'horizontal' ? { aspectRatio: '2.2/1' } : { aspectRatio: '1/1.6', maxWidth: '320px', margin: '0 auto' }}
        />
      </div>

      <div className="shrink-0 h-10 flex items-center justify-center bg-surface-input/80 rounded-md px-3 text-xs border border-surface-border/60">
        {hoveredIndex !== null && funnelData[hoveredIndex] ? (
          <div className="flex w-full items-center justify-between gap-2 animate-fade-in">
            <span className="font-sans text-muted-foreground truncate">{funnelData[hoveredIndex].label}</span>
            <span className="font-mono text-brand font-semibold shrink-0">{formatNumber(funnelData[hoveredIndex].value)}</span>
            <span className="font-mono text-muted-foreground shrink-0">
              {funnelData[hoveredIndex].pct < 1 ? funnelData[hoveredIndex].pct.toFixed(3) : funnelData[hoveredIndex].pct.toFixed(1)}%
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground font-sans">Passe o mouse sobre uma etapa do funil</span>
        )}
      </div>
    </div>
  )
}
