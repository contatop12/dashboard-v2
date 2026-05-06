import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerEnv } from '../../../_lib/worker-env'
import { json, jsonError } from '../../../_lib/json'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import {
  decryptMetaAccessToken,
  getActiveConnectionForOrg,
} from '../../../_lib/org-platform-credentials'

interface Env {
  DB: D1Database
}

function normalizeActId(raw: string): string {
  const t = raw.trim().replace(/\s/g, '')
  if (!t) return ''
  if (t.startsWith('act_')) return t
  return `act_${t}`
}

function uniqLabels(ids: string[], limit: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const n of ids) {
    const t = n.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= limit) break
  }
  return out
}

export async function onRequestGet(context: {
  env: WorkerEnv & Env
  data: { user?: UserRow | null }
  params: { id: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const orgId = context.params.id
  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const conn = await getActiveConnectionForOrg(context.env.DB, orgId, 'meta_ads')
  if (!conn?.oauth_credential_id) {
    return json({
      ok: false,
      hint: 'Conecte Meta Ads em Configurações → Integrações (OAuth) para esta organização.',
      campanha: ['Todas'],
      conjuntoAnuncios: ['Todos'],
      anuncio: ['Todos'],
      objetivo: ['Todos'],
      posicionamento: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'],
    })
  }

  const token = await decryptMetaAccessToken(context.env.DB, context.env, conn.oauth_credential_id)
  if (!token) {
    return json({
      ok: false,
      hint: 'Token Meta inválido. Reconecte em Integrações.',
      campanha: ['Todas'],
      conjuntoAnuncios: ['Todos'],
      anuncio: ['Todos'],
      objetivo: ['Todos'],
      posicionamento: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'],
    })
  }

  const actId = normalizeActId(conn.external_id)
  const enc = encodeURIComponent(token)

  try {
    const [campRes, setRes, adRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v21.0/${actId}/campaigns?fields=id,name,objective&limit=200&access_token=${enc}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${actId}/adsets?fields=id,name&limit=300&access_token=${enc}`
      ),
      fetch(
        `https://graph.facebook.com/v21.0/${actId}/ads?fields=id,name&limit=150&access_token=${enc}`
      ),
    ])

    const campJson = (await campRes.json()) as {
      data?: { name?: string; objective?: string }[]
      error?: { message?: string }
    }
    const setJson = (await setRes.json()) as {
      data?: { name?: string }[]
      error?: { message?: string }
    }
    const adJson = (await adRes.json()) as {
      data?: { name?: string }[]
      error?: { message?: string }
    }

    const graphErr =
      campJson.error?.message || setJson.error?.message || adJson.error?.message || null

    const campaignNames = uniqLabels(
      (campJson.data ?? []).map((c) => c.name ?? '').filter(Boolean),
      200
    )
    const setNames = uniqLabels(
      (setJson.data ?? []).map((s) => s.name ?? '').filter(Boolean),
      300
    )
    const adNames = uniqLabels(
      (adJson.data ?? []).map((a) => a.name ?? '').filter(Boolean),
      150
    )
    const objectives = uniqLabels(
      (campJson.data ?? []).map((c) => String(c.objective ?? '').replace(/_/g, ' ')).filter(Boolean),
      30
    )

    return json({
      ok: graphErr ? false : true,
      graphWarning: graphErr,
      campanha: ['Todas', ...campaignNames],
      conjuntoAnuncios: ['Todos', ...setNames],
      anuncio: ['Todos', ...adNames],
      objetivo: ['Todos', ...objectives],
      posicionamento: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Graph'
    return json({
      ok: false,
      graphWarning: msg,
      campanha: ['Todas'],
      conjuntoAnuncios: ['Todos'],
      anuncio: ['Todos'],
      objetivo: ['Todos'],
      posicionamento: ['Todos', 'Feed', 'Stories', 'Reels', 'Audience Network'],
    })
  }
}
