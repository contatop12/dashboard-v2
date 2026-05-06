import type { WorkerEnv } from '../../../_lib/worker-env'
import type { UserRow } from '../../../_lib/auth'
import { userCanAccessOrg } from '../../../_lib/auth'
import { jsonError } from '../../../_lib/json'
import { signOAuthState } from '../../../_lib/oauth-state'

export async function onRequestGet(context: {
  request: Request
  env: WorkerEnv
  data: { user?: UserRow | null }
  params: { provider: string }
}): Promise<Response> {
  const user = context.data.user
  if (!user) return jsonError('Não autorizado', 401)

  const providerParam = context.params.provider
  if (providerParam !== 'meta' && providerParam !== 'google') {
    return jsonError('Provedor inválido', 400)
  }
  const provider = providerParam as 'meta' | 'google'

  const url = new URL(context.request.url)
  const orgId = url.searchParams.get('org_id')?.trim()
  if (!orgId) return jsonError('org_id obrigatório', 400)

  if (!(await userCanAccessOrg(context.env.DB, user, orgId))) {
    return jsonError('Sem acesso a esta organização', 403)
  }

  const origin = url.origin
  const redirectPath = `/api/oauth/${provider}/callback`

  try {
    const state = await signOAuthState(context.env, {
      u: user.id,
      o: orgId,
      p: provider,
      exp: Math.floor(Date.now() / 1000) + 600,
      n: crypto.randomUUID(),
    })

    if (provider === 'meta') {
      const appId = context.env.META_APP_ID?.trim()
      const secret = context.env.META_APP_SECRET?.trim()
      if (!appId || !secret) {
        return jsonError('META_APP_ID / META_APP_SECRET não configurados no Worker', 503)
      }

      const redirectUri = `${origin}${redirectPath}`
      const scope = [
        'ads_read',
        'ads_management',
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_insights',
        'read_insights',
      ].join(',')

      const authUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
      authUrl.searchParams.set('client_id', appId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('state', state)
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('response_type', 'code')

      return Response.redirect(authUrl.toString(), 302)
    }

    const clientId = context.env.GOOGLE_ADS_CLIENT_ID?.trim()
    const clientSecret = context.env.GOOGLE_ADS_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret) {
      return jsonError('GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET não configurados no Worker', 503)
    }

    const redirectUri = `${origin}${redirectPath}`
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/business.manage',
    ].join(' ')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    return Response.redirect(authUrl.toString(), 302)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao iniciar OAuth'
    return jsonError(msg, 500)
  }
}
