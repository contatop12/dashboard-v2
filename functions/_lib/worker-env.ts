import type { D1Database } from '@cloudflare/workers-types'

/** Bindings do Worker (D1 + secrets/vars do dashboard). */
export type WorkerEnv = {
  DB: D1Database
  META_APP_ID?: string
  META_APP_SECRET?: string
  GOOGLE_ADS_CLIENT_ID?: string
  GOOGLE_ADS_CLIENT_SECRET?: string
  GOOGLE_ADS_DEVELOPER_TOKEN?: string
  GOOGLE_ADS_API_VERSION?: string
  OAUTH_ENC_KEY?: string
  /** Se vazio, usa OAUTH_ENC_KEY para assinar o state (menos ideal). */
  OAUTH_STATE_SECRET?: string
}
