import type { D1Database } from '@cloudflare/workers-types'

/** Bindings do Worker (D1 + secrets/vars do dashboard). */
export type WorkerEnv = {
  DB: D1Database
  META_APP_ID?: string
  META_APP_SECRET?: string
  /** Token de usuário/sistema (Graph API) — uso exclusivo super admin nas páginas do dashboard. */
  META_ACCESS_TOKEN?: string
  /** Conta de anúncios `act_…` ou só o número; se vazio, usa a primeira de `me/adaccounts`. */
  META_AD_ACCOUNT_ID?: string
  /** ID numérico do usuário Instagram Business (Graph API). */
  META_INSTAGRAM_USER_ID?: string

  GOOGLE_ADS_CLIENT_ID?: string
  GOOGLE_ADS_CLIENT_SECRET?: string
  GOOGLE_ADS_DEVELOPER_TOKEN?: string
  GOOGLE_ADS_API_VERSION?: string
  GOOGLE_ADS_REFRESH_TOKEN?: string
  GOOGLE_ADS_CUSTOMER_ID?: string
  GOOGLE_ADS_LOGIN_CUSTOMER_ID?: string

  OAUTH_ENC_KEY?: string
  /** Se vazio, usa OAUTH_ENC_KEY para assinar o state (menos ideal). */
  OAUTH_STATE_SECRET?: string
}
