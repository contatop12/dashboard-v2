/** Configuração das métricas Meta Ads — tiers, chaves e conversões. */

export {
  META_CONVERSION_OPTIONS,
  META_RESULT_TYPE_GROUPS,
  conversionResultLabel,
  groupedConversionOptions,
} from './metaResultTypes'

export const META_METRIC_DEFS = {
  // Primárias
  invest: { tier: 'primary', label: 'Investimento', defaultOn: true },
  conversions: { tier: 'primary', label: 'Conversões', defaultOn: true, dynamicLabel: true },
  costPerResult: { tier: 'primary', label: 'Custo por resultado', defaultOn: true, dynamicLabel: true },
  conversionRate: { tier: 'primary', label: 'Taxa de conversão', defaultOn: true, hint: 'Impressão → resultado' },
  conversionValue: { tier: 'primary', label: 'Valor de conversão', defaultOn: false },
  roas: { tier: 'primary', label: 'ROAS', defaultOn: false },

  // Secundárias
  ctrLink: { tier: 'secondary', label: 'CTR no link', defaultOn: true, hint: 'Sem engajamento social' },
  cpcLink: { tier: 'secondary', label: 'CPC no link', defaultOn: true },
  cpm: { tier: 'secondary', label: 'CPM', defaultOn: true },
  frequency: { tier: 'secondary', label: 'Frequência', defaultOn: true, hint: 'Saturação' },
  reach: { tier: 'secondary', label: 'Alcance', defaultOn: true },
  hookRate: { tier: 'secondary', label: 'Hook rate', defaultOn: true, hint: '3s ÷ impressões' },
  thruPlay: { tier: 'secondary', label: 'ThruPlay', defaultOn: true },
  connectRate: { tier: 'secondary', label: 'Connect rate', defaultOn: true, hint: 'LPV ÷ cliques no link' },

  // Painéis
  videoRetention: { tier: 'panel', label: 'Retenção de vídeo', defaultOn: true },
  qualityRanking: { tier: 'panel', label: 'Índice de qualidade', defaultOn: true },
}

/** Métricas extras disponíveis para adicionar (chips +). */
export const META_ADDABLE_METRICS = [
  { key: 'impressions', label: 'Impressões' },
  { key: 'clicksAll', label: 'Cliques (todos)' },
  { key: 'ctrAll', label: 'CTR (todos)' },
  { key: 'cpcAll', label: 'CPC (todos)' },
  { key: 'linkClicks', label: 'Cliques no link' },
  { key: 'lpViews', label: 'Visualizações LP' },
]

export const META_METRIC_TIER_LABEL = {
  primary: 'Primárias',
  secondary: 'Secundárias',
  panel: 'Painéis',
}
