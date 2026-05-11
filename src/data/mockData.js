export const kpiData = {
  investimento: { value: 1300, formatted: 'R$1,30mil', delta: +12.4, deltaLabel: 'vs mês ant.' },
  resultado: { value: 11, formatted: '11', delta: -8.3, deltaLabel: 'vs mês ant.' },
  custoResultado: { value: 6.91, formatted: 'R$6,91', delta: +4.2, deltaLabel: 'vs mês ant.' },
  retorno: { value: 15000, formatted: 'R$15mil', delta: +6.7, deltaLabel: 'vs mês ant.' },
  cpm: { value: 15.26, formatted: 'R$15,26', delta: -2.1, deltaLabel: 'vs mês ant.' },
  ctr: { value: 3.98, formatted: '3,98%', delta: +0.5, deltaLabel: 'vs mês ant.' },
  // Chaves alinhadas a `API_FIELDS` (métricas custom no painel Geral)
  impressoes: { value: 50000, formatted: '50.000', delta: +14.5, deltaLabel: 'vs mês ant.' },
  alcance: { value: 28500, formatted: '28.500', delta: +18.2, deltaLabel: 'vs mês ant.' },
  cliques: { value: 1990, formatted: '1.990', delta: +9.2, deltaLabel: 'vs mês ant.' },
  cpc: { value: 0.65, formatted: 'R$0,65', delta: -3.1, deltaLabel: 'vs mês ant.' },
  frequencia: { value: 1.76, formatted: '1,76', delta: +2.1, deltaLabel: 'vs mês ant.' },
  conversoes: { value: 11, formatted: '11', delta: -9.1, deltaLabel: 'vs mês ant.' },
  leads: { value: 11, formatted: '11', delta: -5.4, deltaLabel: 'vs mês ant.' },
  visualizacoes: { value: 890, formatted: '890', delta: +7.3, deltaLabel: 'vs mês ant.' },
  roas: { value: 2.85, formatted: '2,85', delta: +4.8, deltaLabel: 'vs mês ant.' },
  cpl: { value: 118.18, formatted: 'R$118,18', delta: -5.4, deltaLabel: 'vs mês ant.' },
}

/** Mock do período anterior (comparação de KPIs — Geral). */
export const kpiDataPrevious = {
  investimento: { value: 1180, formatted: 'R$1,18mil', delta: +6.1, deltaLabel: 'vs período anterior' },
  resultado: { value: 9, formatted: '9', delta: -4.2, deltaLabel: 'vs período anterior' },
  custoResultado: { value: 7.45, formatted: 'R$7,45', delta: -2.8, deltaLabel: 'vs período anterior' },
  retorno: { value: 13200, formatted: 'R$13,2mil', delta: +3.1, deltaLabel: 'vs período anterior' },
  cpm: { value: 16.02, formatted: 'R$16,02', delta: +1.4, deltaLabel: 'vs período anterior' },
  ctr: { value: 3.72, formatted: '3,72%', delta: -0.6, deltaLabel: 'vs período anterior' },
  impressoes: { value: 43800, formatted: '43.800', delta: +6.8, deltaLabel: 'vs período anterior' },
  alcance: { value: 24100, formatted: '24.100', delta: +9.5, deltaLabel: 'vs período anterior' },
  cliques: { value: 1752, formatted: '1.752', delta: +3.1, deltaLabel: 'vs período anterior' },
  cpc: { value: 0.62, formatted: 'R$0,62', delta: -6.2, deltaLabel: 'vs período anterior' },
  frequencia: { value: 1.68, formatted: '1,68', delta: -0.8, deltaLabel: 'vs período anterior' },
  conversoes: { value: 8, formatted: '8', delta: -4.0, deltaLabel: 'vs período anterior' },
  leads: { value: 9, formatted: '9', delta: -5.0, deltaLabel: 'vs período anterior' },
  visualizacoes: { value: 720, formatted: '720', delta: +2.1, deltaLabel: 'vs período anterior' },
  roas: { value: 2.62, formatted: '2,62', delta: +1.2, deltaLabel: 'vs período anterior' },
  cpl: { value: 135.0, formatted: 'R$135,00', delta: +2.1, deltaLabel: 'vs período anterior' },
}

export const funnelData = [
  { label: 'Impressões', value: 50000, pct: 100, color: '#F5C518' },
  { label: 'Alcance', value: 1000, pct: 2.0, color: '#F5C518' },
  { label: 'Cliques no Link', value: 900, pct: 1.8, color: '#F5C518' },
  { label: 'Visualizações de Pág.', value: 450, pct: 0.9, color: '#F5C518' },
  { label: 'Leads (Iniciados)', value: 45, pct: 0.09, color: '#F5C518' },
  { label: 'Leads (Qualificados)', value: 27, pct: 0.054, color: '#F5C518' },
  { label: 'Conversões', value: 11, pct: 0.022, color: '#F5C518' },
]

export const demographicsData = [
  { name: 'São Paulo', value: 45, color: '#F5C518' },
  { name: 'Rio de Janeiro', value: 22, color: '#9B8EFF' },
  { name: 'Minas Gerais', value: 18, color: '#4A9BFF' },
  { name: 'Brasília', value: 15, color: '#FF6B6B' },
]

export const timelineData = [
  { date: '01/jan', leads: 2, custo: 8.5 },
  { date: '05/jan', leads: 4, custo: 7.2 },
  { date: '08/jan', leads: 1, custo: 12.0 },
  { date: '10/jan', leads: 6, custo: 5.8 },
  { date: '12/jan', leads: 3, custo: 9.1 },
  { date: '15/jan', leads: 8, custo: 4.5 },
  { date: '17/jan', leads: 5, custo: 6.3 },
  { date: '19/jan', leads: 11, custo: 3.2 },
  { date: '22/jan', leads: 7, custo: 5.0 },
  { date: '24/jan', leads: 4, custo: 7.8 },
  { date: '26/jan', leads: 9, custo: 4.1 },
  { date: '28/jan', leads: 6, custo: 6.0 },
  { date: '31/jan', leads: 3, custo: 8.9 },
]

export const overviewTableData = [
  {
    campanha: 'Campanha_Leads_SP_Jan',
    impressoes: 28450,
    leads: 6,
    custoPorLead: 5.23,
    ctr: 4.12,
  },
  {
    campanha: 'Campanha_Retarget_RJ',
    impressoes: 12300,
    leads: 3,
    custoPorLead: 8.90,
    ctr: 3.45,
  },
  {
    campanha: 'Campanha_Brand_MG',
    impressoes: 9250,
    leads: 2,
    custoPorLead: 11.50,
    ctr: 2.87,
  },
]

export const videoRangeData = [
  { label: '25%', value: 12.99, color: '#F5C518' },
  { label: '50%', value: 7.61, color: '#9B8EFF' },
  { label: '75%', value: 5.36, color: '#4A9BFF' },
  { label: '100%', value: 2.80, color: '#FF6B6B' },
]

export const keywordsData = [
  { keyword: 'consultoria financeira', impressoes: 8420, cliques: 312, ctr: 3.71, cpc: 2.45 },
  { keyword: 'planejamento financeiro', impressoes: 6130, cliques: 245, ctr: 4.00, cpc: 1.98 },
  { keyword: 'investimentos pessoais', impressoes: 5890, cliques: 198, ctr: 3.36, cpc: 3.12 },
  { keyword: 'gestão patrimônio', impressoes: 4210, cliques: 167, ctr: 3.97, cpc: 4.20 },
  { keyword: 'consultoria riqueza', impressoes: 3450, cliques: 134, ctr: 3.88, cpc: 2.87 },
]

export const campaignOptions = [
  'Todas as Campanhas',
  'Campanha_Leads_SP_Jan',
  'Campanha_Retarget_RJ',
  'Campanha_Brand_MG',
]

export const adGroupOptions = [
  'Todos os Grupos',
  'Grupo_Prospeccao',
  'Grupo_Retargeting',
  'Grupo_Brand',
]

export const objectiveOptions = [
  'Todos os Objetivos',
  'Geração de Leads',
  'Reconhecimento de Marca',
  'Conversão',
  'Tráfego',
]
