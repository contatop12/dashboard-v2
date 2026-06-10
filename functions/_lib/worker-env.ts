import type { D1Database } from '@cloudflare/workers-types'

/** Bindings do Worker (D1 + secrets/vars do dashboard). */
export type WorkerEnv = {
  DB: D1Database
  META_APP_ID?: string
  META_APP_SECRET?: string
  /** Token de usuário/sistema (Graph API) — uso exclusivo super admin nas páginas do dashboard. */
  META_ACCESS_TOKEN?: string
  /** ID do Business Manager (BM) para descoberta de contas no modo super admin. */
  META_BUSINESS_ID?: string
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
  /** Alias comum no .env para MCC (mapeado para login-customer-id). */
  GOOGLE_ADS_MCC_ID?: string

  OAUTH_ENC_KEY?: string
  /** Se vazio, usa OAUTH_ENC_KEY para assinar o state (menos ideal). */
  OAUTH_STATE_SECRET?: string

  /** Cloudflare Access (Zero Trust) team domain, ex.: p12.cloudflareaccess.com. Liga a verificação do JWT do Access quando setado junto com CF_ACCESS_AUD. */
  CF_ACCESS_TEAM_DOMAIN?: string
  /** AUD tag da Access Application (Zero Trust). */
  CF_ACCESS_AUD?: string
  /** E-mails permitidos (vírgula). Padrão: ryansantiago@ e danilo@ @p12digital.com.br */
  ACCESS_ALLOWED_EMAILS?: string
  /** Setar (qualquer valor) desliga o header Content-Security-Policy — escape hatch se quebrar a SPA. */
  CSP_DISABLED?: string
}
