import { videoRangeData } from '@/data/mockData'
import { Play } from 'lucide-react'

export default function VideoRange() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-lg border border-surface-border bg-surface-card p-4">
      <div className="flex shrink-0 items-center gap-2">
        <Play size={12} className="text-brand" fill="currentColor" />
        <span className="section-title">Faixa de Vídeo</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
        <div className="grid grid-cols-4 gap-2">
        {videoRangeData.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-1.5">
            <div className="relative w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                style={{ width: `${(item.value / 15) * 100}%`, backgroundColor: item.color }}
              />
            </div>
            <span className="font-mono text-sm font-semibold text-white">{item.value}%</span>
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-muted-foreground font-sans">{item.label}</span>
            </div>
          </div>
        ))}
        </div>
      </div>

      <div className="shrink-0 text-center font-sans text-[10px] text-muted-foreground">
        % de visualizações que chegaram a cada marco
      </div>
    </div>
  )
}
