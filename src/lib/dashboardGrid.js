/** Grade do dashboard: 8 colunas, margens, gaps e presets. */

export const GRID_COL_COUNT = 8

export const DEFAULT_LAYOUT = {
  marginTop: 24,
  marginRight: 24,
  marginBottom: 24,
  marginLeft: 64,
  gapX: 16,
  gapY: 16,
  /** Largura mínima por coluna (px) — referência ~203 */
  cellMinWidthPx: 200,
  /** Altura base de linha da grade (px) — referência ~94 */
  cellHeightPx: 96,
  columnWeights: [1, 1, 1, 1, 1, 1, 1, 1],
  contentRowMinHeightPx: 120,
  showGridOverlay: false,
  /** @deprecated use cellMinWidthPx — mantido para migração de localStorage */
  kpiMinWidthPx: 200,
  /** @deprecated use cellHeightPx */
  kpiRowMinHeightPx: 96,
}

export const LAYOUT_PRESETS = [
  {
    name: 'Referência (8pt)',
    columnWeights: [1, 1, 1, 1, 1, 1, 1, 1],
    gapX: 8,
    gapY: 8,
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 64,
    cellMinWidthPx: 200,
    cellHeightPx: 96,
  },
  {
    name: 'Confortável (16px)',
    columnWeights: [1, 1, 1, 1, 1, 1, 1, 1],
    gapX: 16,
    gapY: 16,
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 64,
    cellMinWidthPx: 200,
    cellHeightPx: 96,
  },
  {
    name: 'Uniforme',
    columnWeights: [1, 1, 1, 1, 1, 1, 1, 1],
    gapX: 8,
    gapY: 8,
  },
  {
    name: 'Centro amplo',
    columnWeights: [0.72, 0.82, 1, 1.28, 1.28, 1, 0.82, 0.72],
    gapX: 8,
    gapY: 8,
  },
  {
    name: 'Esquerda destacada',
    columnWeights: [1.35, 1.15, 1, 0.95, 0.9, 0.85, 0.8, 0.75],
    gapX: 8,
    gapY: 8,
  },
  {
    name: 'Direita destacada',
    columnWeights: [0.75, 0.8, 0.85, 0.9, 0.95, 1, 1.15, 1.35],
    gapX: 8,
    gapY: 8,
  },
  {
    name: 'Bordas estreitas',
    columnWeights: [0.55, 0.85, 1.05, 1.2, 1.2, 1.05, 0.85, 0.55],
    gapX: 8,
    gapY: 8,
  },
  {
    name: 'Compacto',
    columnWeights: [1, 1, 1, 1, 1, 1, 1, 1],
    gapX: 8,
    gapY: 8,
    cellMinWidthPx: 160,
    cellHeightPx: 80,
  },
]

/** Normaliza layout salvo (chaves antigas + defaults). */
export function normalizeLayout(layout) {
  const L = { ...DEFAULT_LAYOUT, ...(layout && typeof layout === 'object' ? layout : {}) }
  if (!Array.isArray(L.columnWeights) || L.columnWeights.length !== GRID_COL_COUNT) {
    L.columnWeights = [...DEFAULT_LAYOUT.columnWeights]
  }
  if (L.cellMinWidthPx == null && L.kpiMinWidthPx != null) L.cellMinWidthPx = L.kpiMinWidthPx
  if (L.cellHeightPx == null && L.kpiRowMinHeightPx != null) L.cellHeightPx = L.kpiRowMinHeightPx
  L.cellMinWidthPx = Math.max(48, Math.min(400, Number(L.cellMinWidthPx) || DEFAULT_LAYOUT.cellMinWidthPx))
  L.cellHeightPx = Math.max(48, Math.min(240, Number(L.cellHeightPx) || DEFAULT_LAYOUT.cellHeightPx))
  L.marginTop = Math.max(0, Number(L.marginTop) ?? DEFAULT_LAYOUT.marginTop)
  L.marginRight = Math.max(0, Number(L.marginRight) ?? DEFAULT_LAYOUT.marginRight)
  L.marginBottom = Math.max(0, Number(L.marginBottom) ?? DEFAULT_LAYOUT.marginBottom)
  L.marginLeft = Math.max(0, Number(L.marginLeft) ?? DEFAULT_LAYOUT.marginLeft)
  L.gapX = Math.max(0, Number(L.gapX) ?? DEFAULT_LAYOUT.gapX)
  L.gapY = Math.max(0, Number(L.gapY) ?? DEFAULT_LAYOUT.gapY)
  return L
}

function sanitizeWeights(weights) {
  const a = Array.isArray(weights) && weights.length === GRID_COL_COUNT
    ? weights
    : DEFAULT_LAYOUT.columnWeights
  return a.map(w => {
    const n = Number(w)
    return Number.isFinite(n) && n > 0 ? n : 1
  })
}

/**
 * Colunas proporcionais (8 trilhas). Usa minmax(0, fr) para nunca ultrapassar a largura
 * disponível — min fixo por coluna (ex. 203×8 px) causa scroll horizontal.
 * cellMinWidthPx permanece nos tokens/design system como referência de UI (variável --dash-cell-min-w).
 */
export function buildGridTemplateColumns(weights, _minPx) {
  const w = sanitizeWeights(weights)
  return w.map(weight => `minmax(0, ${weight}fr)`).join(' ')
}

const STORAGE_PREFIX = 'dashboard-blocks-'

export function blockLayoutStorageKey(pageId) {
  return `${STORAGE_PREFIX}${pageId}`
}

export function clearAllBlockLayouts() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k)
    }
  } catch { /* ignore */ }
}
