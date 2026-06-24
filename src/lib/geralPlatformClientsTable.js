export const GERAL_CLIENTS_PERIOD_MODES = [
  { id: 'filter', label: 'Período do filtro' },
  { id: 'yesterday', label: 'Ontem' },
]

export const META_CLIENTS_COLUMNS = [
  { id: 'conta', label: 'Conta', defaultVisible: true, canHide: false },
  { id: 'investimento', label: 'Investimento', defaultVisible: true },
  { id: 'resultado', label: 'Resultado', defaultVisible: true },
  { id: 'custoPorResultado', label: 'Custo / resultado', defaultVisible: true },
  { id: 'impressoes', label: 'Impressões', defaultVisible: true },
  { id: 'alcance', label: 'Alcance', defaultVisible: false },
  { id: 'cliques', label: 'Cliques (link)', defaultVisible: true },
  { id: 'leads', label: 'Leads', defaultVisible: false },
  { id: 'ctr', label: 'CTR', defaultVisible: true },
  { id: 'cpc', label: 'CPC', defaultVisible: false },
  { id: 'cpm', label: 'CPM', defaultVisible: false },
  { id: 'frequencia', label: 'Frequência', defaultVisible: false },
]

export const GOOGLE_CLIENTS_COLUMNS = [
  { id: 'conta', label: 'Conta', defaultVisible: true, canHide: false },
  { id: 'investimento', label: 'Investimento', defaultVisible: true },
  { id: 'conversoes', label: 'Conversões', defaultVisible: true },
  { id: 'custoPorConversao', label: 'Custo / conversão', defaultVisible: true },
  { id: 'impressoes', label: 'Impressões', defaultVisible: true },
  { id: 'cliques', label: 'Cliques', defaultVisible: true },
  { id: 'ctr', label: 'CTR', defaultVisible: true },
  { id: 'cpc', label: 'CPC médio', defaultVisible: false },
  { id: 'taxaConversao', label: 'Taxa de conv.', defaultVisible: false },
  { id: 'valorConversao', label: 'Valor / conversão', defaultVisible: false },
]

export function defaultColumnVisibility(columns) {
  return Object.fromEntries(columns.map((c) => [c.id, c.defaultVisible !== false]))
}

export function mapMetaClientRow(raw) {
  const resultado = Number(raw.metaResults) > 0 ? Number(raw.metaResults) : Number(raw.leads) || 0
  return {
    id: String(raw.id ?? raw.accountId ?? ''),
    conta: String(raw.name ?? raw.id ?? '—'),
    investimento: Number(raw.spend) || 0,
    resultado,
    custoPorResultado: raw.costPerResult != null ? Number(raw.costPerResult) : null,
    impressoes: Math.round(Number(raw.impressions) || 0),
    alcance: Math.round(Number(raw.reach) || 0),
    cliques: Math.round(Number(raw.linkClicks ?? raw.clicks) || 0),
    leads: Math.round(Number(raw.leads) || 0),
    ctr: Number(raw.ctr) || 0,
    cpc: Number(raw.cpc) || 0,
    cpm: Number(raw.cpm) || 0,
    frequencia: Number(raw.frequency) || 0,
    error: raw.error ?? null,
  }
}

export function mapGoogleClientRow(raw) {
  const conversions = Number(raw.conversions) || 0
  const conversionsValue = Number(raw.conversionsValue) || 0
  return {
    id: String(raw.id ?? ''),
    conta: String(raw.name ?? raw.id ?? '—'),
    investimento: Number(raw.spend) || 0,
    conversoes: conversions,
    custoPorConversao: raw.costPerConversion != null ? Number(raw.costPerConversion) : null,
    impressoes: Math.round(Number(raw.impressions) || 0),
    cliques: Math.round(Number(raw.clicks) || 0),
    ctr: Number(raw.ctr) || 0,
    cpc: Number(raw.cpc) || 0,
    taxaConversao: Number(raw.conversionRate) || 0,
    valorConversao: conversions > 0 ? conversionsValue / conversions : null,
    error: raw.error ?? null,
  }
}
