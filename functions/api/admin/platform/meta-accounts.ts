import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'

export type MetaAdAccountRow = { id: string; name: string; account_id: string }

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
}): Promise<Response> {
  const user = context.data.user
  const denied = requireSuperAdmin(user)
  if (denied) return denied

  const token = context.env.META_ACCESS_TOKEN?.trim()
  if (!token) {
    return json({ accounts: [] as MetaAdAccountRow[], error: 'META_ACCESS_TOKEN não configurado no Worker.' })
  }

  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() || ''

  const bizId = context.env.META_BUSINESS_ID?.trim()
  const merged: MetaAdAccountRow[] = []
  const seen = new Set<string>()

  try {
    if (bizId) {
      const [ownedR, clientR] = await Promise.all([
        fetch(
          `https://graph.facebook.com/v21.0/${bizId}/owned_ad_accounts?fields=name,account_id&limit=100&access_token=${encodeURIComponent(token)}`
        ),
        fetch(
          `https://graph.facebook.com/v21.0/${bizId}/client_ad_accounts?fields=name,account_id&limit=100&access_token=${encodeURIComponent(token)}`
        ),
      ])
      const [ownedD, clientD] = (await Promise.all([
        ownedR.json(),
        clientR.json(),
      ])) as [{ data?: { name?: string; account_id?: string }[] }, { data?: { name?: string; account_id?: string }[] }]

      for (const a of [...(ownedD.data ?? []), ...(clientD.data ?? [])]) {
        if (!a.account_id || seen.has(a.account_id)) continue
        seen.add(a.account_id)
        const id = normalizeActId(a.account_id)
        merged.push({
          id,
          account_id: a.account_id,
          name: (a.name ?? id).trim() || id,
        })
      }
    } else {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=name,account_id&limit=100&access_token=${encodeURIComponent(token)}`
      )
      const d = (await r.json()) as { data?: { name?: string; account_id?: string }[]; error?: { message?: string } }
      if (!r.ok || d.error) {
        return json({
          accounts: [] as MetaAdAccountRow[],
          error: d.error?.message || 'Graph API falhou ao listar ad accounts',
        })
      }
      for (const a of d.data ?? []) {
        if (!a.account_id || seen.has(a.account_id)) continue
        seen.add(a.account_id)
        const id = normalizeActId(a.account_id)
        merged.push({
          id,
          account_id: a.account_id,
          name: (a.name ?? id).trim() || id,
        })
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Meta'
    return json({ accounts: [] as MetaAdAccountRow[], error: msg })
  }

  const filtered = q
    ? merged.filter((a) => `${a.name} ${a.id} ${a.account_id}`.toLowerCase().includes(q))
    : merged

  return json({ accounts: filtered, error: null as string | null })
}
