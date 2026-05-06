import type { WorkerEnv } from './worker-env'

/** Access token via refresh_token nas variáveis do Worker (Google Ads / APIs Google). */
export async function getGoogleAccessTokenFromEnv(env: WorkerEnv): Promise<string | null> {
  const refresh = env.GOOGLE_ADS_REFRESH_TOKEN?.trim()
  const clientId = env.GOOGLE_ADS_CLIENT_ID?.trim()
  const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET?.trim()
  if (!refresh || !clientId || !clientSecret) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string }
  if (!res.ok || !data.access_token) return null
  return data.access_token
}
