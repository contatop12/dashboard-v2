/** Altura de cada unidade de linha no grid estático (equivale ao rowHeight do RGL). */
export const ROW_HEIGHT_PX = 72

/**
 * Infere quantas colunas o dashboard usa com base nas definições dos blocos.
 * Páginas de plataforma (Meta, Google…) usam grade de 8 colunas; Geral usa 12.
 */
export function inferGridColumnCount(definitions) {
  if (definitions.some((d) => d.defaultColSpan != null)) return 8
  return 12
}

/**
 * Normaliza `defaultLayout` (12 col) e `defaultColSpan` (8 col) para spans unificados.
 */
export function getBlockSpans(def, tier = 'secondary') {
  if (def.defaultColSpan != null) {
    return {
      colSpan: def.defaultColSpan,
      rowSpan: def.defaultRowSpan ?? 1,
    }
  }
  if (def.defaultLayout) {
    return {
      colSpan: def.defaultLayout.w ?? (tier === 'primary' ? 2 : 6),
      rowSpan: def.defaultLayout.h ?? (tier === 'primary' ? 2 : 4),
    }
  }
  return {
    colSpan: tier === 'primary' ? 2 : 6,
    rowSpan: tier === 'primary' ? 2 : 4,
  }
}

export function blockGridStyle(def, tier, gridCols) {
  const { colSpan, rowSpan } = getBlockSpans(def, tier)
  return {
    '--block-col-span': String(Math.min(colSpan, gridCols)),
    '--block-min-h': `${rowSpan * ROW_HEIGHT_PX}px`,
  }
}
