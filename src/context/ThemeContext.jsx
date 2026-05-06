import { createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_LAYOUT, normalizeLayout } from '@/lib/dashboardGrid'

const FONTS_LINK_ID = 'dynamic-google-fonts'

// All fonts that may be requested — preloaded in a single <link>
const ALL_FONTS = [
  'Syne', 'Bebas Neue', 'Playfair Display', 'Orbitron', 'Space Grotesk', 'Anton',
  'Outfit', 'DM Sans', 'Nunito', 'Poppins', 'Manrope', 'Inter',
  'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono',
]

export const FONT_OPTIONS = {
  display: ['Syne', 'Bebas Neue', 'Playfair Display', 'Orbitron', 'Space Grotesk', 'Anton'],
  sans: ['Outfit', 'DM Sans', 'Nunito', 'Poppins', 'Manrope', 'Inter'],
  mono: ['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono'],
}

export const DEFAULT_THEME = {
  colors: {
    brand: '#F5C518',
    accent: '#9B8EFF',
    background: '#0F0F0F',
    surfaceCard: '#1E1E1E',
    surfaceHover: '#242424',
    surfaceInput: '#282828',
    border: '#2C2C2C',
    muted: '#323232',
    mutedFg: '#888888',
    foreground: '#FFFFFF',
  },
  fonts: {
    display: 'Syne',
    sans: 'Outfit',
    mono: 'JetBrains Mono',
  },
  layout: { ...DEFAULT_LAYOUT },
}

// Hex "#RRGGBB" → "R G B" (space-separated for CSS variable rgb() usage)
function hexToRGB(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

function applyTheme(theme) {
  const root = document.documentElement
  const { colors, fonts, layout } = theme

  // Set RGB channel variables — Tailwind reads these via rgb(var(...) / <alpha>)
  root.style.setProperty('--color-brand', hexToRGB(colors.brand))
  root.style.setProperty('--color-accent', hexToRGB(colors.accent))
  root.style.setProperty('--color-background', hexToRGB(colors.background))
  root.style.setProperty('--color-surface-card', hexToRGB(colors.surfaceCard))
  root.style.setProperty('--color-surface-hover', hexToRGB(colors.surfaceHover))
  root.style.setProperty('--color-surface-input', hexToRGB(colors.surfaceInput))
  root.style.setProperty('--color-border', hexToRGB(colors.border))
  root.style.setProperty('--color-muted', hexToRGB(colors.muted))
  root.style.setProperty('--color-muted-fg', hexToRGB(colors.mutedFg))
  root.style.setProperty('--color-foreground', hexToRGB(colors.foreground))
  // Also update body bg directly for full-page color
  root.style.setProperty('--color-surface', hexToRGB(colors.surfaceCard))
  document.body.style.backgroundColor = colors.background

  // Font CSS variables — Tailwind font-* classes use var(--font-*)
  root.style.setProperty('--font-display', `"${fonts.display}"`)
  root.style.setProperty('--font-sans', `"${fonts.sans}"`)
  root.style.setProperty('--font-mono', `"${fonts.mono}"`)

  const L = normalizeLayout(layout)
  root.style.setProperty('--dash-gap-x', `${L.gapX}px`)
  root.style.setProperty('--dash-gap-y', `${L.gapY}px`)
  root.style.setProperty('--dash-m-top', `${L.marginTop}px`)
  root.style.setProperty('--dash-m-right', `${L.marginRight}px`)
  root.style.setProperty('--dash-m-bottom', `${L.marginBottom}px`)
  root.style.setProperty('--dash-m-left', `${L.marginLeft}px`)
  root.style.setProperty('--dash-cell-min-w', `${L.cellMinWidthPx}px`)
  root.style.setProperty('--dash-cell-h', `${L.cellHeightPx}px`)
  root.style.setProperty('--dash-kpi-min-w', `${L.cellMinWidthPx}px`)
  root.style.setProperty('--dash-kpi-row-min-h', `${L.cellHeightPx}px`)
  root.style.setProperty('--dash-content-row-min-h', `${L.contentRowMinHeightPx}px`)
}

// Load ALL fonts upfront from Google — single request, no re-fetch on change
function loadAllGoogleFonts() {
  if (document.getElementById(FONTS_LINK_ID)) return

  const families = ALL_FONTS
    .map(f => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800`)
    .join('&')

  const url = `https://fonts.googleapis.com/css2?${families}&display=swap`

  const link = document.createElement('link')
  link.id = FONTS_LINK_ID
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard-theme-v2')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults so new keys added to DEFAULT_THEME don't break saved data
        const mergedLayout = normalizeLayout({
          ...DEFAULT_THEME.layout,
          ...(parsed.layout && typeof parsed.layout === 'object' ? parsed.layout : {}),
        })
        return {
          ...DEFAULT_THEME,
          ...parsed,
          colors: { ...DEFAULT_THEME.colors, ...parsed.colors },
          fonts: { ...DEFAULT_THEME.fonts, ...parsed.fonts },
          layout: mergedLayout,
        }
      }
    } catch { /* ignore */ }
    return DEFAULT_THEME
  })

  // Load all Google Fonts once on mount
  useEffect(() => { loadAllGoogleFonts() }, [])

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem('dashboard-theme-v2', JSON.stringify(theme)) } catch { /* ignore */ }
  }, [theme])

  function updateColor(key, value) {
    setTheme(t => ({ ...t, colors: { ...t.colors, [key]: value } }))
  }

  function updateFont(key, value) {
    setTheme(t => ({ ...t, fonts: { ...t.fonts, [key]: value } }))
  }

  function resetTheme() {
    setTheme(DEFAULT_THEME)
    try { localStorage.removeItem('dashboard-theme-v2') } catch { /* ignore */ }
  }

  function applyPreset(presetColors) {
    setTheme(t => ({ ...t, colors: { ...t.colors, ...presetColors } }))
  }

  function updateLayout(partial) {
    setTheme(t => ({ ...t, layout: normalizeLayout({ ...DEFAULT_LAYOUT, ...t.layout, ...partial }) }))
  }

  function setColumnWeight(index, value) {
    setTheme(t => {
      const prev = normalizeLayout({ ...DEFAULT_LAYOUT, ...t.layout })
      const next = [...prev.columnWeights]
      const n = Number(value)
      const w = Number.isFinite(n) && n > 0 ? Math.min(4, n) : 1
      if (index >= 0 && index < 8) next[index] = w
      return { ...t, layout: normalizeLayout({ ...prev, columnWeights: next }) }
    })
  }

  function applyLayoutPreset(preset) {
    setTheme(t => ({
      ...t,
      layout: normalizeLayout({
        ...DEFAULT_LAYOUT,
        ...t.layout,
        ...preset,
        columnWeights: preset.columnWeights?.length === 8
          ? [...preset.columnWeights]
          : t.layout?.columnWeights ?? DEFAULT_LAYOUT.columnWeights,
      }),
    }))
  }

  function resetLayout() {
    setTheme(t => ({ ...t, layout: normalizeLayout({ ...DEFAULT_LAYOUT }) }))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateColor,
        updateFont,
        resetTheme,
        applyPreset,
        updateLayout,
        setColumnWeight,
        applyLayoutPreset,
        resetLayout,
        FONT_OPTIONS,
        DEFAULT_THEME,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
