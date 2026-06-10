import { useState, useCallback, useMemo } from 'react'

const DEFAULT_ENDPOINT = '/api/admin/platform/meta-campaign-status'

/** POST status change to a platform mutate endpoint. Returns boolean ok; exposes error message. */
export function useCampaignStatusMutation(orgId, { endpoint = DEFAULT_ENDPOINT, extraBody } = {}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const extraBodyJson = useMemo(() => JSON.stringify(extraBody ?? {}), [extraBody])

  const mutate = useCallback(
    async ({ level, id, nextStatus }) => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, level, id, status: nextStatus, ...JSON.parse(extraBodyJson) }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || data?.error) {
          setError(typeof data?.error === 'string' ? data.error : 'Falha ao atualizar status')
          return false
        }
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro de rede')
        return false
      } finally {
        setPending(false)
      }
    },
    [orgId, endpoint, extraBodyJson]
  )

  return { mutate, pending, error }
}
