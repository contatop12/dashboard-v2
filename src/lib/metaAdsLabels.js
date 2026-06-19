/** Rótulos amigáveis para objective da Meta (filtros e UI). */
export const META_OBJECTIVE_LABELS = {
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_APP_PROMOTION: 'Promoção do app',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_LINK_CLICKS: 'Tráfego (cliques)',
  LINK_CLICKS: 'Tráfego (cliques)',
  CONVERSIONS: 'Conversões',
  LEAD_GENERATION: 'Geração de leads',
  BRAND_AWARENESS: 'Reconhecimento da marca',
  REACH: 'Alcance',
  MESSAGES: 'Mensagens',
  VIDEO_VIEWS: 'Visualizações de vídeo',
  LEADS: 'Leads (formulário)',
  APP_PROMOTION: 'Instalações do app',
}

export function metaObjectiveLabel(key) {
  const k = String(key ?? '').trim().toUpperCase()
  return META_OBJECTIVE_LABELS[k] || (k ? k.replace(/_/g, ' ') : '—')
}

export const META_STATUS_FILTER_OPTIONS = [
  { id: 'ACTIVE', name: 'Ativas' },
  { id: 'PAUSED', name: 'Pausadas' },
  { id: 'ERROR', name: 'Com erros' },
]
