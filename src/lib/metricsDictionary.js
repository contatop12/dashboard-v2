// Single source of truth for metric labels, definitions, formulas.
// Consumed by KPI cards, table headers, and MetricInfo tooltips.
export const METRICS = {
  // Primary (all platforms)
  invest: { label: 'Investimento', definition: 'Total gasto no período.', formula: null, platform: 'all', tier: 'primary' },
  results: { label: 'Resultados', definition: 'Volume de resultados (lead via formulário nativo, clique no WhatsApp, ligação). O rótulo varia pelo objetivo.', formula: null, platform: 'all', tier: 'primary' },
  cpl: { label: 'Custo por resultado', definition: 'Quanto custa cada lead/ação.', formula: 'Investimento ÷ resultados', platform: 'all', tier: 'primary' },
  conversionRate: { label: 'Taxa de conversão', definition: 'Eficiência do funil pós-clique (clique → lead).', formula: 'Resultados ÷ cliques', platform: 'all', tier: 'primary' },
  roas: { label: 'ROAS', definition: 'Retorno sobre o investimento. Só e-commerce (valor de conversão via pixel).', formula: 'Valor de conversão ÷ gasto', platform: 'all', tier: 'primary' },

  // Cross-platform volume
  impressions: { label: 'Impressões', definition: 'Quantas vezes os anúncios foram exibidos.', formula: null, platform: 'all', tier: 'secondary' },
  clicks: { label: 'Cliques', definition: 'Total de cliques nos anúncios.', formula: null, platform: 'all', tier: 'secondary' },
  conversions: { label: 'Conversões', definition: 'Total de ações de conversão registradas no período.', formula: null, platform: 'all', tier: 'secondary' },

  // Secondary — Meta
  ctrLink: { label: 'CTR no link', definition: 'Usar este, não o CTR "de todos" (que infla com engajamento).', formula: 'Cliques no link ÷ impressões', platform: 'meta', tier: 'secondary' },
  cpcLink: { label: 'CPC no link', definition: 'Custo por clique no link.', formula: 'Gasto ÷ cliques no link', platform: 'meta', tier: 'secondary' },
  cpm: { label: 'CPM', definition: 'Custo por mil impressões.', formula: 'Gasto ÷ impressões × 1000', platform: 'meta', tier: 'secondary' },
  frequency: { label: 'Frequência', definition: 'Média de vezes que cada pessoa viu o anúncio. Alta = saturação de público.', formula: 'Impressões ÷ alcance', platform: 'meta', tier: 'secondary' },
  reach: { label: 'Alcance', definition: 'Pessoas únicas atingidas.', formula: null, platform: 'meta', tier: 'secondary' },
  videoRetention: { label: 'Retenção de vídeo', definition: 'Reprodução a 25/50/75/100% e ThruPlay. Avalia criativo em vídeo.', formula: null, platform: 'meta', tier: 'secondary' },
  qualityRanking: { label: 'Índice de qualidade', definition: 'Os 3 rankings (qualidade, engajamento e taxa de conversão) vs concorrentes do leilão.', formula: null, platform: 'meta', tier: 'secondary' },

  // Secondary — Google
  ctr: { label: 'CTR', definition: 'Taxa de cliques.', formula: 'Cliques ÷ impressões', platform: 'google', tier: 'secondary' },
  cpcAvg: { label: 'CPC médio', definition: 'Custo médio por clique.', formula: 'Gasto ÷ cliques', platform: 'google', tier: 'secondary' },
  impressionShare: { label: 'Parcela de impressões (IS)', definition: '% das impressões possíveis que você obteve.', formula: null, platform: 'google', tier: 'secondary' },
  isLostBudget: { label: 'IS perdida por orçamento', definition: '% de impressões perdidas por verba insuficiente. Sinal direto para escalar orçamento.', formula: null, platform: 'google', tier: 'secondary' },
  isLostRank: { label: 'IS perdida por classificação', definition: '% perdida por ranking. Sinal de lance ou qualidade.', formula: null, platform: 'google', tier: 'secondary' },
  topShare: { label: 'Parcela no topo / topo absoluto', definition: '% de aparições no topo (e topo absoluto) da página.', formula: null, platform: 'google', tier: 'secondary' },
  qualityScore: { label: 'Índice de qualidade', definition: 'Nota geral + componentes: CTR esperado, relevância do anúncio, experiência na LP.', formula: null, platform: 'google', tier: 'secondary' },
  searchTerms: { label: 'Termos de pesquisa', definition: 'Termos reais que dispararam anúncios. Onde se corta desperdício (negativas).', formula: null, platform: 'google', tier: 'secondary' },
}

export function getMetric(key) {
  return METRICS[key] ?? { label: key, definition: '', formula: null, platform: 'all', tier: 'secondary' }
}
