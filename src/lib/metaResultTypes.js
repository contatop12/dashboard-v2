/**
 * Espelho de functions/_lib/meta-result-types.ts — manter ids/labels/grupos sincronizados.
 */

export const META_RESULT_TYPE_GROUPS = [
  'Campanha',
  'Leads e cadastros',
  'Tráfego',
  'Engajamento',
  'Vídeo',
  'Vendas',
  'App e ações',
]

export const META_CONVERSION_OPTIONS = [
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

export function conversionResultLabel(conversionId) {
  const row = META_CONVERSION_OPTIONS.find((o) => o.id === conversionId)
  if (!row) return 'Resultados'
  if (row.id === 'auto') return 'Resultado Meta'
  return row.label.replace(' (resultado da Meta)', '').replace('Automático', 'Resultado Meta')
}

export function groupedConversionOptions() {
  return META_RESULT_TYPE_GROUPS.map((group) => ({
    group,
    options: META_CONVERSION_OPTIONS.filter((o) => o.group === group),
  })).filter((g) => g.options.length > 0)
}
