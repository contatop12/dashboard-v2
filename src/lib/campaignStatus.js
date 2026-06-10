export const STATUS_COLOR = { success: 'success', danger: 'danger', neutral: 'neutral' }

const DANGER = new Set(['DISAPPROVED', 'WITH_ISSUES', 'PENDING_REVIEW', 'PENDING_BILLING_INFO', 'PENDING_PROCESSING'])
const NEUTRAL = new Set(['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS'])

/** Meta effective_status → color key used for tree border/background. */
export function mapEffectiveStatusToColor(status) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'ACTIVE') return STATUS_COLOR.success
  if (DANGER.has(s)) return STATUS_COLOR.danger
  if (NEUTRAL.has(s)) return STATUS_COLOR.neutral
  return STATUS_COLOR.neutral
}

/** Tailwind classes per color key for a tree row (border + tinted bg). */
export const STATUS_ROW_CLASS = {
  success: 'border-emerald-800/40 bg-emerald-950/35',
  danger: 'border-danger/40 bg-danger/[0.08]',
  neutral: 'border-surface-border bg-surface-card/80',
}
