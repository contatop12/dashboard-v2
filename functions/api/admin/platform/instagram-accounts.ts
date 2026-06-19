import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { requireSuperAdmin } from '../../../_lib/admin-guard'
import { json } from '../../../_lib/json'

export type InstagramAccountRow = { id: string; name: string; username: string }

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
    return json({
      accounts: [] as InstagramAccountRow[],
      error: 'META_ACCESS_TOKEN não configurado no Worker.',
    })
  }

  const url = new URL(context.request.url)
  const q = url.searchParams.get('q')?.trim().toLowerCase() || ''
  const merged: InstagramAccountRow[] = []
  const seen = new Set<string>()

  const pushAccount = (id: string, username: string, name: string) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    const userName = username.trim()
    const display = userName ? `@${userName}` : name.trim() || `IG ${id}`
    merged.push({ id, username: userName, name: display })
  }

  try {
    const configured = context.env.META_INSTAGRAM_USER_ID?.trim()
    if (configured) {
      const pr = await fetch(
        `https://graph.facebook.com/v21.0/${configured}?fields=username,name&access_token=${encodeURIComponent(token)}`
      )
      const pj = (await pr.json()) as { username?: string; name?: string; error?: { message?: string } }
      if (pr.ok && !pj.error) {
        pushAccount(configured, String(pj.username ?? ''), String(pj.name ?? ''))
      } else {
        pushAccount(configured, '', `IG ${configured}`)
      }
    }

    const bizId = context.env.META_BUSINESS_ID?.trim()
    const pageUrls: string[] = []
    if (bizId) {
      pageUrls.push(
        `https://graph.facebook.com/v21.0/${bizId}/owned_pages?fields=name,instagram_business_account{id,username,name}&limit=100&access_token=${encodeURIComponent(token)}`,
        `https://graph.facebook.com/v21.0/${bizId}/client_pages?fields=name,instagram_business_account{id,username,name}&limit=100&access_token=${encodeURIComponent(token)}`
      )
    } else {
      pageUrls.push(
        `https://graph.facebook.com/v21.0/me/accounts?fields=name,instagram_business_account{id,username,name}&limit=100&access_token=${encodeURIComponent(token)}`
      )
    }

    for (const pageUrl of pageUrls) {
      let next: string | null = pageUrl
      for (let page = 0; page < 5 && next; page++) {
        const r = await fetch(next)
        const j = (await r.json()) as {
          data?: {
            name?: string
            instagram_business_account?: { id?: string; username?: string; name?: string }
          }[]
          paging?: { next?: string }
          error?: { message?: string }
        }
        if (!r.ok || j.error) break
        for (const row of j.data ?? []) {
          const ig = row.instagram_business_account
          if (!ig?.id) continue
          pushAccount(String(ig.id), String(ig.username ?? ''), String(ig.name ?? row.name ?? ''))
        }
        next = j.paging?.next ?? null
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar contas Instagram'
    return json({ accounts: [] as InstagramAccountRow[], error: msg })
  }

  const filtered = q
    ? merged.filter((a) => `${a.name} ${a.username} ${a.id}`.toLowerCase().includes(q))
    : merged

  return json({ accounts: filtered, error: null as string | null })
}
