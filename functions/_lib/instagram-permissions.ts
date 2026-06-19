export const IG_REQUIRED_SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
] as const

export function isIgPermissionError(message: string | null | undefined): boolean {
  const m = String(message ?? '').toLowerCase()
  return (
    m.includes('application does not have permission') ||
    m.includes('(#10)') ||
    m.includes('insufficient_scope') ||
    m.includes('missing permissions') ||
    m.includes('does not have permission for this action')
  )
}

export function igPermissionHelpMessage(): string {
  return (
    'O token Meta não possui instagram_basic e instagram_manage_insights. ' +
    'No Graph API Explorer (developers.facebook.com/tools/explorer), selecione o app, marque ' +
    'instagram_basic, instagram_manage_insights, pages_show_list e pages_read_engagement, ' +
    'gere um novo token de usuário e atualize META_ACCESS_TOKEN (npm run cf:secrets:sync).'
  )
}
