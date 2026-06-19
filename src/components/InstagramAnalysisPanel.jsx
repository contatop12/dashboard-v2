import { useEffect, useMemo, useState } from 'react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Settings2 } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/utils'
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { PieChart, Pie, Cell, Tooltip as RechartsPieTooltip, ResponsiveContainer as PieResponsiveContainer } from 'recharts'
import { usePlatformOverview } from '@/components/PlatformOverviewProvider'

const IG_PINK = '#E1306C'
const IG_PURPLE = '#9B8EFF'
const IG_AMBER = '#F5C518'

const IG_CHART_LS = 'p12_instagram_daily_chart_mode'
const IG_VISIBLE_MODES_LS = 'p12_instagram_daily_visible_modes'

const IG_CHART_MODES = [
  { id: 'alcance_impressoes', label: 'Alcance e impressões' },
  { id: 'engajamento', label: 'Engajamento' },
  { id: 'perfil', label: 'Visualizações de perfil' },
]

function readIgChartMode() {
  try {
    const v = localStorage.getItem(IG_CHART_LS)?.trim()
    if (v && IG_CHART_MODES.some((m) => m.id === v)) return v
  } catch {
    /* ignore */
  }
  return 'alcance_impressoes'
}

function readIgVisibleChartModes() {
  try {
    const raw = localStorage.getItem(IG_VISIBLE_MODES_LS)
    if (!raw) return IG_CHART_MODES.map((m) => m.id)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return IG_CHART_MODES.map((m) => m.id)
    const allowed = new Set(IG_CHART_MODES.map((m) => m.id))
    const filtered = parsed.filter((id) => typeof id === 'string' && allowed.has(id))
    return filtered.length > 0 ? filtered : IG_CHART_MODES.map((m) => m.id)
  } catch {
    return IG_CHART_MODES.map((m) => m.id)
  }
}

function mapIgDailyToChart(daily) {
  if (!Array.isArray(daily) || daily.length === 0) {
    return [{ dia: '—', alcance: 0, impressoes: 0, interacoes: 0, engajamento: 0, perfil: 0 }]
  }
  return daily.map((d) => {
    let dia = d.date || '—'
    try {
      if (d.date) dia = format(parse(d.date, 'yyyy-MM-dd', new Date()), 'dd/MM', { locale: ptBR })
    } catch {
      /* keep raw */
    }
    const reach = Math.round(Number(d.reach) || 0)
    const interactions = Math.round(Number(d.interactions) || 0)
    return {
      dia,
      alcance: reach,
      impressoes: Math.round(Number(d.impressions) || 0),
      interacoes: interactions,
      engajamento: reach > 0 ? (interactions / reach) * 100 : 0,
      perfil: Math.round(Number(d.profileViews) || 0),
    }
  })
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-sans text-muted-foreground">Dia {label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-sans text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-semibold text-white">
            {p.name === 'Eng. %' ? formatPercent(Number(p.value) || 0) : formatNumber(Math.round(Number(p.value) || 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

function AlcanceImpressoesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="igReachGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={IG_PINK} stopOpacity={0.25} />
            <stop offset="95%" stopColor={IG_PINK} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area yAxisId="left" type="monotone" dataKey="alcance" name="Alcance" stroke={IG_PINK} strokeWidth={2} fill="url(#igReachGrad)" dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="impressoes" name="Impressões" stroke={IG_PURPLE} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EngajamentoChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="igEngGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={IG_AMBER} stopOpacity={0.25} />
            <stop offset="95%" stopColor={IG_AMBER} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area yAxisId="left" type="monotone" dataKey="interacoes" name="Interações" stroke={IG_AMBER} strokeWidth={2} fill="url(#igEngGrad)" dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="engajamento" name="Eng. %" stroke={IG_PURPLE} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function PerfilChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C2C2C" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#666', fontFamily: 'Outfit' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: '#666', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="perfil" name="Visualizações" stroke={IG_PINK} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function InstagramAnalysisPanel() {
  const { data } = usePlatformOverview()
  const [mode, setMode] = useState(readIgChartMode)
  const [visibleModes, setVisibleModes] = useState(readIgVisibleChartModes)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const chartData = useMemo(() => mapIgDailyToChart(data?.daily), [data?.daily])
  const contentTypes = Array.isArray(data?.contentTypes) ? data.contentTypes : []

  useEffect(() => {
    try {
      localStorage.setItem(IG_CHART_LS, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem(IG_VISIBLE_MODES_LS, JSON.stringify(visibleModes))
    } catch {
      /* ignore */
    }
  }, [visibleModes])

  const activeModes = IG_CHART_MODES.filter((m) => visibleModes.includes(m.id))
  const safeMode = activeModes.some((m) => m.id === mode) ? mode : activeModes[0]?.id ?? 'alcance_impressoes'

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#121212] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="section-title">Análise diária</span>
          <p className="mt-0.5 text-[10px] text-muted-foreground font-sans">Tendências do perfil no período filtrado</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={safeMode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-input px-2.5 py-1.5 text-[11px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-pink-500/30"
          >
            {activeModes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-surface-border text-muted-foreground hover:text-foreground"
            aria-label="Configurar gráficos"
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {settingsOpen ? (
        <div className="mb-3 flex flex-wrap gap-2 rounded-lg border border-white/[0.06] bg-surface-card p-3">
          {IG_CHART_MODES.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground">
              <input
                type="checkbox"
                checked={visibleModes.includes(m.id)}
                onChange={(e) => {
                  const on = e.target.checked
                  setVisibleModes((prev) => {
                    const next = on ? [...new Set([...prev, m.id])] : prev.filter((id) => id !== m.id)
                    return next.length > 0 ? next : [m.id]
                  })
                }}
              />
              {m.label}
            </label>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-52 lg:col-span-3">
          {safeMode === 'alcance_impressoes' ? <AlcanceImpressoesChart data={chartData} /> : null}
          {safeMode === 'engajamento' ? <EngajamentoChart data={chartData} /> : null}
          {safeMode === 'perfil' ? <PerfilChart data={chartData} /> : null}
        </div>
        <div className="flex min-h-[13rem] flex-col rounded-lg border border-surface-border bg-surface-card p-3 lg:col-span-2">
          <span className="section-title mb-2 block shrink-0">Tipo de conteúdo</span>
          {contentTypes.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">Sem publicações no período.</p>
          ) : (
            <div className="flex min-h-0 flex-1 items-center gap-3">
              <div className="h-28 w-28 shrink-0">
                <PieResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={contentTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {contentTypes.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <RechartsPieTooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </PieResponsiveContainer>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {contentTypes.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 truncate text-[10px] font-sans text-muted-foreground">{c.name}</span>
                    <span className="font-mono text-[11px] text-white">{c.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
