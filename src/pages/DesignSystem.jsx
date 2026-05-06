import { useState } from 'react'
import { Palette, Type, RotateCcw, Check, Zap, TrendingUp, Eye, Target, Grid3x3 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { DEFAULT_LAYOUT, LAYOUT_PRESETS, clearAllBlockLayouts } from '@/lib/dashboardGrid'

const COLOR_KEYS = [
  { key: 'brand', label: 'Cor Principal (Brand)', desc: 'Botões, KPIs, destaques' },
  { key: 'accent', label: 'Cor Accent', desc: 'Gráficos secundários, badges' },
  { key: 'background', label: 'Background', desc: 'Fundo geral da aplicação' },
  { key: 'surfaceCard', label: 'Surface (Cards)', desc: 'Cards e painéis' },
  { key: 'surfaceHover', label: 'Surface Hover', desc: 'Estado hover dos cards' },
  { key: 'border', label: 'Borda', desc: 'Divisores e bordas' },
  { key: 'mutedFg', label: 'Texto Secundário', desc: 'Labels e descrições' },
  { key: 'foreground', label: 'Texto Principal', desc: 'Títulos e valores' },
]

const PRESET_PALETTES = [
  {
    name: 'Gold & Dark',
    colors: { brand: '#F5C518', accent: '#9B8EFF', background: '#0F0F0F', surfaceCard: '#1E1E1E', surfaceHover: '#242424', surfaceInput: '#282828', border: '#2C2C2C', muted: '#323232', mutedFg: '#888888', foreground: '#FFFFFF' },
  },
  {
    name: 'Cyan Neon',
    colors: { brand: '#00E5FF', accent: '#FF4081', background: '#050A0E', surfaceCard: '#0D1B2A', surfaceHover: '#122233', surfaceInput: '#0A1520', border: '#1A3A5C', muted: '#1A2B3C', mutedFg: '#546E7A', foreground: '#E0F7FA' },
  },
  {
    name: 'Emerald',
    colors: { brand: '#00E676', accent: '#FFAB40', background: '#030E06', surfaceCard: '#071A0C', surfaceHover: '#0C2414', surfaceInput: '#091810', border: '#1B4332', muted: '#1B3A2C', mutedFg: '#6B9E80', foreground: '#F1F8F5' },
  },
  {
    name: 'Violet Pro',
    colors: { brand: '#7C3AED', accent: '#F59E0B', background: '#0A0A14', surfaceCard: '#13131F', surfaceHover: '#1A1A2A', surfaceInput: '#111120', border: '#252538', muted: '#222235', mutedFg: '#8080AA', foreground: '#F5F3FF' },
  },
  {
    name: 'Rose Dark',
    colors: { brand: '#F43F5E', accent: '#0EA5E9', background: '#0D0508', surfaceCard: '#1A0811', surfaceHover: '#220D17', surfaceInput: '#18090E', border: '#3B0D1D', muted: '#2E0B18', mutedFg: '#9F6A78', foreground: '#FFF1F2' },
  },
  {
    name: 'Warm Slate',
    colors: { brand: '#F97316', accent: '#6366F1', background: '#121110', surfaceCard: '#1C1A19', surfaceHover: '#242220', surfaceInput: '#201E1D', border: '#2E2C2A', muted: '#2A2826', mutedFg: '#8B8680', foreground: '#FFFBF5' },
  },
]

function FontSelector({ label, fontKey, value, options, onSelect }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>{label}</span>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between bg-surface-input border border-surface-border rounded-lg px-3 py-2.5 text-sm hover:border-brand/40 transition-all w-full text-left"
          style={{ fontFamily: `"${value}", sans-serif`, color: 'rgb(var(--color-foreground))' }}
        >
          <span>{value}</span>
          <span style={{ color: 'rgb(var(--color-muted-fg))' }} className="text-xs ml-2 shrink-0">▾</span>
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg py-1 z-50 shadow-xl max-h-60 overflow-y-auto">
          {options.map(font => (
            <button
              key={font}
              onClick={() => { onSelect(fontKey, font); setOpen(false) }}
              className={cn('w-full text-left px-3 py-2.5 transition-colors hover:bg-surface-hover', value === font ? 'text-brand' : 'text-white')}
              style={{ fontFamily: `"${font}", sans-serif` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{font}</span>
                {value === font && <Check size={12} className="text-brand" />}
              </div>
              <span className="text-[10px] block mt-0.5" style={{ color: 'rgb(var(--color-muted-fg))', fontFamily: `"${font}", sans-serif` }}>
                Aa Bb Cc — The quick brown fox — 0123456789
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Preview({ theme }) {
  const bg = theme.colors.background
  const card = theme.colors.surfaceCard
  const border = theme.colors.border
  const brand = theme.colors.brand
  const fg = theme.colors.foreground
  const muted = theme.colors.mutedFg

  return (
    <div className="rounded-xl overflow-hidden border" style={{ background: bg, borderColor: border }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: bg, borderBottom: `1px solid ${border}` }}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: brand }}>
          <Zap size={12} style={{ color: bg }} />
        </div>
        <span className="text-sm font-bold" style={{ color: fg, fontFamily: `"${theme.fonts.display}", sans-serif` }}>P12 Dashboard</span>
        <span style={{ color: border }}>|</span>
        <span className="text-sm" style={{ color: muted, fontFamily: `"${theme.fonts.sans}", sans-serif` }}>Preview</span>
      </div>

      <div className="p-4 grid grid-cols-3 gap-2">
        {[{ label: 'Investimento', value: 'R$1,30mil', icon: Target }, { label: 'Leads', value: '11', icon: Eye }, { label: 'CTR', value: '3,98%', icon: TrendingUp }].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg p-3 flex flex-col gap-1" style={{ background: card, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: muted, fontFamily: `"${theme.fonts.sans}", sans-serif` }}>{label}</span>
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${brand}25` }}>
                <Icon size={10} style={{ color: brand }} />
              </div>
            </div>
            <span className="text-base font-semibold" style={{ color: fg, fontFamily: `"${theme.fonts.mono}", monospace` }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-lg p-3 flex items-center justify-between" style={{ background: card, border: `1px solid ${border}` }}>
          <span className="text-xs" style={{ color: muted, fontFamily: `"${theme.fonts.sans}", sans-serif` }}>Amostra de botão e texto</span>
          <button className="text-xs px-3 py-1 rounded-md font-semibold" style={{ background: brand, color: bg, fontFamily: `"${theme.fonts.sans}", sans-serif` }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function DesignSystem() {
  const {
    theme,
    updateColor,
    updateFont,
    resetTheme,
    applyPreset,
    FONT_OPTIONS,
    updateLayout,
    setColumnWeight,
    applyLayoutPreset,
    resetLayout,
  } = useTheme()
  const L = theme.layout
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Design System</h1>
          <p className="text-sm mt-0.5 font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Personalize cores e fontes — aplica ao vivo, salva no navegador</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetTheme} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface-card border border-surface-border rounded-md transition-all font-sans hover:bg-surface-hover" style={{ color: 'rgb(var(--color-muted-fg))' }}>
            <RotateCcw size={12} /> Resetar
          </button>
          <button onClick={handleSave} className={cn('flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md transition-all', saved ? 'bg-green-500 text-white' : 'bg-brand text-[#0F0F0F] hover:opacity-90')}>
            {saved ? <><Check size={12} /> Salvo!</> : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="flex flex-col gap-5">

          {/* Presets */}
          <section className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-brand" />
              <span className="font-display font-semibold text-sm">Paletas Predefinidas</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_PALETTES.map(preset => (
                <button key={preset.name} onClick={() => applyPreset(preset.colors)} className="flex flex-col gap-2 p-3 rounded-lg bg-surface-input hover:bg-surface-hover border border-surface-border hover:border-brand/40 transition-all text-left group">
                  <div className="flex gap-1">
                    {[preset.colors.brand, preset.colors.accent, preset.colors.surfaceCard, preset.colors.background].map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-full border border-black/20" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-sans transition-colors" style={{ color: 'rgb(var(--color-muted-fg))' }}>{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Colors */}
          <section className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={14} className="text-brand" />
              <span className="font-display font-semibold text-sm">Cores</span>
            </div>
            <div className="flex flex-col gap-3">
              {COLOR_KEYS.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-lg border border-surface-border overflow-hidden cursor-pointer hover:scale-105 transition-transform" style={{ background: theme.colors[key] }}>
                      <input
                        type="color"
                        value={theme.colors[key] ?? '#000000'}
                        onChange={e => updateColor(key, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-sans block" style={{ color: 'rgb(var(--color-foreground))' }}>{label}</span>
                    <span className="text-[10px] font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>{desc}</span>
                  </div>
                  <span className="font-mono text-[10px] shrink-0" style={{ color: 'rgb(var(--color-muted-fg))' }}>{theme.colors[key]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Fonts */}
          <section className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type size={14} className="text-brand" />
              <span className="font-display font-semibold text-sm">Tipografia</span>
              <span className="text-[10px] font-sans ml-auto" style={{ color: 'rgb(var(--color-muted-fg))' }}>Google Fonts — carregadas automaticamente</span>
            </div>
            <div className="flex flex-col gap-4">
              <FontSelector label="Display (Títulos e Headings)" fontKey="display" value={theme.fonts.display} options={FONT_OPTIONS.display} onSelect={updateFont} />
              <FontSelector label="Sans (Texto Geral e Labels)" fontKey="sans" value={theme.fonts.sans} options={FONT_OPTIONS.sans} onSelect={updateFont} />
              <FontSelector label="Mono (Números e Métricas)" fontKey="mono" value={theme.fonts.mono} options={FONT_OPTIONS.mono} onSelect={updateFont} />
            </div>
          </section>

          <section className="bg-surface-card border border-surface-border rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Grid3x3 size={14} className="text-brand shrink-0" />
              <span className="font-display font-semibold text-sm">Grade — 8 colunas</span>
              <div className="flex flex-wrap gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={resetLayout}
                  className="text-[10px] font-sans px-2 py-1 rounded-md border border-surface-border hover:border-brand/40 transition-colors"
                  style={{ color: 'rgb(var(--color-muted-fg))' }}
                >
                  Resetar tokens da grade
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Apagar posições e tamanhos salvos dos blocos em todas as páginas? (Recarregue a página ou troque de aba para aplicar.)')) {
                      clearAllBlockLayouts()
                    }
                  }}
                  className="text-[10px] font-sans px-2 py-1 rounded-md border border-surface-border hover:border-red-400/50 transition-colors"
                  style={{ color: 'rgb(var(--color-muted-fg))' }}
                  title="Remove posições e tamanhos salvos dos blocos em todas as páginas"
                >
                  Limpar layouts dos blocos
                </button>
              </div>
            </div>
            <p className="text-[11px] font-sans mb-4 leading-relaxed" style={{ color: 'rgb(var(--color-muted-fg))' }}>
              Margens do canvas (topo/direita/baixo/esquerda), gap, largura mínima e altura base por célula, pesos por coluna (fr). Em telas abaixo de <code className="text-[10px] font-mono text-brand">lg</code> a grade vira coluna única; arrastar e redimensionar funcionam no desktop.
            </p>

            <span className="text-[10px] uppercase tracking-wider font-sans block mb-2" style={{ color: 'rgb(var(--color-muted-fg))' }}>Presets</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {LAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyLayoutPreset(preset)}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface-input hover:bg-surface-hover border border-surface-border hover:border-brand/40 transition-all text-left"
                >
                  <span className="text-xs font-sans" style={{ color: 'rgb(var(--color-foreground))' }}>{preset.name}</span>
                  <span className="text-[9px] font-mono leading-tight" style={{ color: 'rgb(var(--color-muted-fg))' }}>
                    gap {preset.gapX ?? L.gapX}×{preset.gapY ?? L.gapY}px
                    {preset.marginLeft != null && (
                      <> · margens {preset.marginTop ?? L.marginTop}/{preset.marginRight ?? L.marginRight}/{preset.marginBottom ?? L.marginBottom}/{preset.marginLeft}</>
                    )}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-[10px] uppercase tracking-wider font-sans block mb-2" style={{ color: 'rgb(var(--color-muted-fg))' }}>Margens do canvas (px)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { key: 'marginTop', label: 'Topo' },
                { key: 'marginRight', label: 'Direita' },
                { key: 'marginBottom', label: 'Baixo' },
                { key: 'marginLeft', label: 'Esquerda' },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>{label}</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={L[key]}
                    onChange={(e) => updateLayout({ [key]: Number(e.target.value) || 0 })}
                    className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
              ))}
            </div>

            <span className="text-[10px] uppercase tracking-wider font-sans block mb-2" style={{ color: 'rgb(var(--color-muted-fg))' }}>Peso por coluna (1 → 8)</span>
            <div className="flex flex-col gap-2 mb-5">
              {(L.columnWeights ?? []).map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono w-7 shrink-0 text-muted-foreground">C{i + 1}</span>
                  <input
                    type="range"
                    min={0.35}
                    max={2.5}
                    step={0.05}
                    value={w}
                    onChange={(e) => setColumnWeight(i, e.target.value)}
                    className="flex-1 h-1 accent-brand cursor-pointer"
                  />
                  <span className="text-[10px] font-mono w-10 text-right shrink-0" style={{ color: 'rgb(var(--color-muted-fg))' }}>
                    {Number(w).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Gap horizontal (px)</span>
                <input
                  type="number"
                  min={0}
                  max={48}
                  value={L.gapX}
                  onChange={(e) => updateLayout({ gapX: Number(e.target.value) || DEFAULT_LAYOUT.gapX })}
                  className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Gap vertical (px)</span>
                <input
                  type="number"
                  min={0}
                  max={48}
                  value={L.gapY}
                  onChange={(e) => updateLayout({ gapY: Number(e.target.value) || DEFAULT_LAYOUT.gapY })}
                  className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Largura mín. célula (px)</span>
                <input
                  type="number"
                  min={48}
                  max={400}
                  value={L.cellMinWidthPx ?? L.kpiMinWidthPx}
                  onChange={(e) => updateLayout({ cellMinWidthPx: Number(e.target.value) || DEFAULT_LAYOUT.cellMinWidthPx })}
                  className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Altura base linha (px)</span>
                <input
                  type="number"
                  min={48}
                  max={240}
                  value={L.cellHeightPx ?? L.kpiRowMinHeightPx}
                  onChange={(e) => updateLayout({ cellHeightPx: Number(e.target.value) || DEFAULT_LAYOUT.cellHeightPx })}
                  className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Altura mín. blocos (classe .dashboard legado)</span>
                <input
                  type="number"
                  min={80}
                  max={400}
                  value={L.contentRowMinHeightPx}
                  onChange={(e) => updateLayout({ contentRowMinHeightPx: Number(e.target.value) || 120 })}
                  className="bg-surface-input border border-surface-border rounded-md px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!L.showGridOverlay}
                onChange={(e) => updateLayout({ showGridOverlay: e.target.checked })}
                className="rounded border-surface-border"
              />
              <span className="text-xs font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Destacar contorno da área da grade</span>
            </label>
          </section>
        </div>

        {/* Live preview */}
        <div className="flex flex-col gap-4">
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={13} style={{ color: 'rgb(var(--color-muted-fg))' }} />
              <span className="text-xs uppercase tracking-wider font-sans" style={{ color: 'rgb(var(--color-muted-fg))' }}>Preview ao Vivo</span>
            </div>
            <Preview theme={theme} />

            <div className="mt-4 bg-surface-card border border-surface-border rounded-xl p-5">
              <span className="section-title block mb-4">Amostra de Tipografia</span>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-sans block mb-1" style={{ color: 'rgb(var(--color-muted-fg))' }}>Display — {theme.fonts.display}</span>
                  <p className="text-2xl font-bold font-display">Dashboard Analytics P12</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-sans block mb-1" style={{ color: 'rgb(var(--color-muted-fg))' }}>Sans — {theme.fonts.sans}</span>
                  <p className="text-sm font-sans">Investimento em mídia paga, performance de campanhas e análise de funil de conversão.</p>
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-sans block mb-1" style={{ color: 'rgb(var(--color-muted-fg))' }}>Mono — {theme.fonts.mono}</span>
                  <p className="text-sm font-mono text-brand">R$1.302,45 · 3,98% CTR · 50.000 impressões</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
