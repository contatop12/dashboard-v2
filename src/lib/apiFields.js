export const API_FIELDS = [
  { key: 'impressoes', label: 'Impressões', format: 'number' },
  { key: 'alcance', label: 'Alcance', format: 'number' },
  { key: 'cliques', label: 'Cliques no Link', format: 'number' },
  { key: 'cpc', label: 'CPC', format: 'currency' },
  { key: 'frequencia', label: 'Frequência', format: 'decimal' },
  { key: 'conversoes', label: 'Conversões', format: 'number' },
  { key: 'leads', label: 'Leads', format: 'number' },
  { key: 'visualizacoes', label: 'Visualizações de Pág.', format: 'number' },
  { key: 'roas', label: 'ROAS', format: 'decimal' },
  { key: 'cpl', label: 'CPL', format: 'currency' },
]

export function formatFieldValue(value, format) {
  if (value == null) return '—'
  switch (format) {
    case 'currency':
      return `R$${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'decimal':
      return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    default:
      return Number(value).toLocaleString('pt-BR')
  }
}
