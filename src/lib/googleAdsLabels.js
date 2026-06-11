/** Rótulos amigáveis para advertising_channel_type (filtros e UI). */
export const GOOGLE_CHANNEL_TYPE_LABELS = {
  SEARCH: 'Search',
  DISPLAY: 'Display',
  SHOPPING: 'Shopping',
  VIDEO: 'Vídeo',
  PERFORMANCE_MAX: 'Performance Max',
  DEMAND_GEN: 'Demand Gen',
  LOCAL: 'Local',
  SMART: 'Smart',
  HOTEL: 'Hotel',
  MULTI_CHANNEL: 'Multicanal',
  UNSPECIFIED: 'Não especificado',
}

export function googleChannelTypeLabel(key) {
  const k = String(key ?? '').trim().toUpperCase()
  return GOOGLE_CHANNEL_TYPE_LABELS[k] || key || '—'
}

export const GOOGLE_CAMPAIGN_STATUS_FILTER_OPTIONS = [
  { id: 'ACTIVE', name: 'Ativas' },
  { id: 'PAUSED', name: 'Pausadas' },
]
