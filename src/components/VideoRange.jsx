import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { videoRangeData } from '@/data/mockData'
import { BlockCard } from '@/components/ui/BlockCard'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, value } = payload[0].payload
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow">
      <span className="text-muted-foreground">Marco </span>
      <span className="font-semibold text-foreground">{label}</span>
      <span className="ml-2 font-mono text-brand">{value}%</span>
    </div>
  )
}

export default function VideoRange() {
  return (
    <BlockCard title="Retenção de vídeo" badge="por marco" bodyClassName="flex flex-col gap-3">
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <div className="h-full min-h-[140px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={videoRangeData}
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={3}
                dataKey="value"
              >
                {videoRangeData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {videoRangeData.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-muted-foreground font-sans">Marco {item.label}</span>
              <span className="ml-auto font-mono text-xs font-semibold text-foreground">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <p className="shrink-0 text-center font-sans text-[10px] text-muted-foreground">
        % de visualizações por marco do vídeo
      </p>
    </BlockCard>
  )
}
