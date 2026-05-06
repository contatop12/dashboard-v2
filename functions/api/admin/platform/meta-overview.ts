import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'

type Metric = { label: string; value: string }

function fmtBRL(n: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n)
}

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

async function resolveAdAccountId(token: string, env: WorkerEnv): Promise<string | null> {
  const configured = env.META_AD_ACCOUNT_ID?.trim()
  if (configured) return normalizeActId(configured)
  const r = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=account_id&limit=1&access_token=${encodeURIComponent(token)}`
  )
  const j = (await r.json()) as { data?: { account_id?: string }[]; error?: { message?: string } }
  const id = j.data?.[0]?.account_id
  if (!id) return null
  return normalizeActId(id)
}

/** Nome amigável da conta de anúncios (Graph). */
async function fetchAdAccountDisplay(token: string, actId: string): Promise<string | null> {
  const u = new URL(`https://graph.facebook.com/v21.0/${actId}`)
  u.searchParams.set('fields', 'name,account_id')
  u.searchParams.set('access_token', token)
  const r = await fetch(u.toString())
  const j = (await r.json()) as {
    name?: string
    account_id?: string
    error?: { message?: string }
  }
  if (!r.ok || j.error || !j.name?.trim()) return null
  return j.name.trim()
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const denied = requireSuperAdmin(context.data.user)
  if (denied) return denied

  const token = context.env.META_ACCESS_TOKEN?.trim()
  if (!token) {
    return json({
      configured: false,
      source: 'worker_env',
      accountDisplay: null as string | null,
      error: null,
      detail: 'Defina o secret META_ACCESS_TOKEN no Worker.',
      metrics: [] as Metric[],
    })
  }

  try {
    const actId = await resolveAdAccountId(token, context.env)
    const accountDisplay = actId ? (await fetchAdAccountDisplay(token, actId)) || actId : null
    if (!actId) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay,
        error: 'Nenhuma conta de anúncios acessível com este token. Defina META_AD_ACCOUNT_ID ou conceda ads_read/ads_management.',
        detail: null,
        metrics: [] as Metric[],
      })
    }

    const fields = [
      'spend',
      'impressions',
      'reach',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'frequency',
    ].join(',')
    const iu = new URL(`https://graph.facebook.com/v21.0/${actId}/insights`)
    iu.searchParams.set('fields', fields)
    iu.searchParams.set('date_preset', 'last_30d')
    iu.searchParams.set('access_token', token)

    const ir = await fetch(iu.toString())
    const idata = (await ir.json()) as {
      data?: Record<string, string | number>[]
      error?: { message?: string }
    }

    if (!ir.ok || idata.error) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay,
        error: idata.error?.message || 'Graph API insights falhou',
        detail: actId,
        metrics: [] as Metric[],
      })
    }

    const row = idata.data?.[0]
    if (!row) {
      return json({
        configured: true,
        source: 'worker_env',
        accountDisplay,
        error: 'Sem linhas de insights (período ou permissões).',
        detail: actId,
        metrics: [] as Metric[],
      })
    }

    const spend = Number.parseFloat(String(row.spend ?? 0)) || 0
    const impressions = Number.parseFloat(String(row.impressions ?? 0)) || 0
    const reach = Number.parseFloat(String(row.reach ?? 0)) || 0
    const clicks = Number.parseFloat(String(row.clicks ?? 0)) || 0
    const ctr = Number.parseFloat(String(row.ctr ?? 0)) || 0
    const cpc = Number.parseFloat(String(row.cpc ?? 0)) || 0
    const cpm = Number.parseFloat(String(row.cpm ?? 0)) || 0
    const frequency = Number.parseFloat(String(row.frequency ?? 0)) || 0

    const metrics: Metric[] = [
      { label: 'Gasto (30d)', value: fmtBRL(spend) },
      { label: 'Impressões', value: fmtInt(impressions) },
      { label: 'Alcance', value: fmtInt(reach) },
      { label: 'Cliques', value: fmtInt(clicks) },
      { label: 'CTR', value: `${ctr.toFixed(2)}%` },
      { label: 'CPC', value: fmtBRL(cpc) },
      { label: 'CPM', value: fmtBRL(cpm) },
      { label: 'Frequência', value: frequency.toFixed(2) },
    ]

    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay,
      error: null,
      detail: `Conta ${actId} · últimos 30 dias (Graph)`,
      metrics,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro Meta'
    return json({
      configured: true,
      source: 'worker_env',
      accountDisplay: null as string | null,
      error: msg,
      detail: null,
      metrics: [] as Metric[],
    })
  }
}
