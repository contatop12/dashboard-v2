/** Extrai o ID numérico de um resource name ou string parcial do Google Ads. */
export function extractConversionActionId(resourceName: string): string {
  const trimmed = resourceName.trim()
  if (!trimmed) return ''
  const match =
    trimmed.match(/conversionActions\/(\d+)/i) ?? trimmed.match(/conversion_actions\/(\d+)/i)
  if (match) return match[1]
  if (/^\d+$/.test(trimmed)) return trimmed
  return trimmed
}

function readStringField(obj: unknown, ...keys: string[]): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}

function readBoolField(obj: unknown, ...keys: string[]): boolean | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  const o = obj as Record<string, unknown>
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'boolean') return v
  }
  return undefined
}

/** Lê resource name em segments.conversion_action (string ou objeto). */
export function readConversionActionResourceName(segments: unknown): string | undefined {
  if (!segments || typeof segments !== 'object') return undefined
  const s = segments as Record<string, unknown>
  const ca = s.conversionAction ?? s.conversion_action
  if (typeof ca === 'string' && ca.trim()) return ca.trim()
  if (ca && typeof ca === 'object') {
    return readStringField(ca, 'resourceName', 'resource_name')
  }
  return undefined
}

export type ConversionActionFields = {
  resourceName: string | undefined
  name: string | undefined
  primaryForGoal: boolean | undefined
}

/** Lê campos de conversion_action no nível raiz da linha GAQL. */
export function parseConversionActionFields(row: Record<string, unknown>): ConversionActionFields {
  const ca = row.conversionAction ?? row.conversion_action
  if (typeof ca === 'string' && ca.trim()) {
    return { resourceName: ca.trim(), name: undefined, primaryForGoal: undefined }
  }
  if (ca && typeof ca === 'object') {
    return {
      resourceName: readStringField(ca, 'resourceName', 'resource_name'),
      name: readStringField(ca, 'name'),
      primaryForGoal: readBoolField(ca, 'primaryForGoal', 'primary_for_goal'),
    }
  }
  return { resourceName: undefined, name: undefined, primaryForGoal: undefined }
}

export function buildConversionResourceName(customerId: string, actionId: string): string {
  const cid = customerId.replace(/\D/g, '')
  const aid = extractConversionActionId(actionId)
  return `customers/${cid}/conversionActions/${aid}`
}
