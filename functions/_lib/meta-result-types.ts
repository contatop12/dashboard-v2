import { parseLeadsFromRow, parseObjectiveResults, sumInsightActions, sumVideoMetricField, parseThruPlayFromRow, parseVideo3SecFromRow } from './meta-conversions'

export type MetaResultTypeId =
  | 'auto'
  | 'leads'
  | 'link_click'
  | 'landing_page_view'
  | 'outbound_click'
  | 'view_content'
  | 'post_engagement'
  | 'page_engagement'
  | 'messages'
  | 'thruplay'
  | 'video_view'
  | 'purchases'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'complete_registration'
  | 'contact'
  | 'submit_application'
  | 'schedule'
  | 'phone_call'
  | 'app_install'
  | 'subscribe'
  | 'donate'
  | 'start_trial'
  | 'find_location'
  | 'customize_product'

export type MetaResultTypeOption = {
  id: MetaResultTypeId
  label: string
  group: string
}

/** Alinhado aos tipos de resultado do Gerenciador de Anúncios da Meta (PT-BR). */
export const META_RESULT_TYPE_OPTIONS: MetaResultTypeOption[] = [
  { id: 'auto', label: 'Automático (resultado da Meta)', group: 'Campanha' },
  { id: 'leads', label: 'Leads', group: 'Leads e cadastros' },
  { id: 'complete_registration', label: 'Cadastros concluídos', group: 'Leads e cadastros' },
  { id: 'submit_application', label: 'Candidaturas enviadas', group: 'Leads e cadastros' },
  { id: 'link_click', label: 'Cliques no link', group: 'Tráfego' },
  { id: 'landing_page_view', label: 'Visualizações da página de destino', group: 'Tráfego' },
  { id: 'outbound_click', label: 'Cliques de saída', group: 'Tráfego' },
  { id: 'view_content', label: 'Visualizações de conteúdo', group: 'Tráfego' },
  { id: 'post_engagement', label: 'Engajamento com a publicação', group: 'Engajamento' },
  { id: 'page_engagement', label: 'Engajamento com a página', group: 'Engajamento' },
  { id: 'messages', label: 'Conversas por mensagem iniciadas', group: 'Engajamento' },
  { id: 'thruplay', label: 'ThruPlay', group: 'Vídeo' },
  { id: 'video_view', label: 'Visualizações de vídeo (3 segundos)', group: 'Vídeo' },
  { id: 'purchases', label: 'Compras', group: 'Vendas' },
  { id: 'add_to_cart', label: 'Adições ao carrinho', group: 'Vendas' },
  { id: 'initiate_checkout', label: 'Checkout iniciado', group: 'Vendas' },
  { id: 'app_install', label: 'Instalações do app', group: 'App e ações' },
  { id: 'contact', label: 'Contatos', group: 'App e ações' },
  { id: 'phone_call', label: 'Cliques para ligar', group: 'App e ações' },
  { id: 'schedule', label: 'Agendamentos', group: 'App e ações' },
  { id: 'subscribe', label: 'Assinaturas', group: 'App e ações' },
  { id: 'donate', label: 'Doações', group: 'App e ações' },
  { id: 'start_trial', label: 'Trials iniciados', group: 'App e ações' },
  { id: 'find_location', label: 'Buscas de localização', group: 'App e ações' },
  { id: 'customize_product', label: 'Personalizações de produto', group: 'App e ações' },
]

const ACTION_MATCHERS: Record<Exclude<MetaResultTypeId, 'auto' | 'leads' | 'thruplay' | 'video_view' | 'link_click'>, (t: string) => boolean> = {
  landing_page_view: (t) => t === 'landing_page_view' || t.includes('landing_page_view'),
  outbound_click: (t) => t === 'outbound_click',
  view_content: (t) => t.includes('view_content') || t === 'omni_view_content',
  post_engagement: (t) => t === 'post_engagement',
  page_engagement: (t) => t === 'page_engagement',
  messages: (t) =>
    t.includes('messaging_conversation_started') ||
    t.includes('onsite_conversion.messaging') ||
    t === 'onsite_conversion.messaging_first_reply',
  purchases: (t) =>
    t === 'omni_purchase' ||
    t === 'offsite_conversion.fb_pixel_purchase' ||
    t === 'purchase' ||
    (t.includes('purchase') && !t.includes('add_to_cart') && !t.includes('initiate_checkout')),
  add_to_cart: (t) => t.includes('add_to_cart') || t === 'omni_add_to_cart',
  initiate_checkout: (t) => t.includes('initiate_checkout') || t === 'omni_initiated_checkout',
  complete_registration: (t) => t.includes('complete_registration') || t === 'omni_complete_registration',
  contact: (t) => (t.includes('contact') || t === 'contact_total') && !t.includes('messaging'),
  submit_application: (t) => t.includes('submit_application'),
  schedule: (t) => t.includes('schedule'),
  phone_call: (t) => t.includes('phone_call') || t.includes('click_to_call'),
  app_install: (t) =>
    t === 'app_install' || t === 'mobile_app_install' || t === 'omni_app_install',
  subscribe: (t) => t.includes('subscribe'),
  donate: (t) => t.includes('donate'),
  start_trial: (t) => t.includes('start_trial'),
  find_location: (t) => t.includes('find_location'),
  customize_product: (t) => t.includes('customize_product'),
}

export type MetaResultRowExtras = {
  linkClicks?: number
  thruPlay?: number
  hookViews?: number
}

export function parseResultCountFromRow(
  row: Record<string, unknown>,
  resultId: MetaResultTypeId,
  extras: MetaResultRowExtras = {}
): number {
  const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
  switch (resultId) {
    case 'auto': {
      const objective = parseObjectiveResults(row)
      return objective > 0 ? objective : parseLeadsFromRow(row)
    }
    case 'leads':
      return parseLeadsFromRow(row)
    case 'link_click':
      if (extras.linkClicks != null && extras.linkClicks > 0) return Math.round(extras.linkClicks)
      return Math.round(
        Number.parseFloat(String(row.inline_link_clicks ?? 0)) ||
          sumInsightActions(row, (t) => t === 'link_click' || t.includes('link_click'))
      )
    case 'thruplay':
      if (extras.thruPlay != null && extras.thruPlay > 0) return Math.round(extras.thruPlay)
      return parseThruPlayFromRow(row, spend)
    case 'video_view':
      if (extras.hookViews != null && extras.hookViews > 0) return Math.round(extras.hookViews)
      return parseVideo3SecFromRow(row)
    default: {
      const match = ACTION_MATCHERS[resultId]
      return match ? sumInsightActions(row, match) : 0
    }
  }
}

export function buildResultsByTypeFromRow(
  row: Record<string, unknown>,
  extras: MetaResultRowExtras = {}
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const opt of META_RESULT_TYPE_OPTIONS) {
    out[opt.id] = parseResultCountFromRow(row, opt.id, extras)
  }
  return out
}

export function resultTypeLabel(resultId: string): string {
  return META_RESULT_TYPE_OPTIONS.find((o) => o.id === resultId)?.label ?? 'Resultados'
}
