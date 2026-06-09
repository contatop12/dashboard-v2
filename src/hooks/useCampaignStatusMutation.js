import { useState, useCallback } from 'react'

/** POST status change to the Meta mutate endpoint. Returns boolean ok; exposes error message. */
export function useCampaignStatusMutation(orgId) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async ({ level, id, nextStatus }) => {
      setPending(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/platform/meta-campaign-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, level, id, status: nextStatus }),
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
    [orgId]
  )

  return { mutate, pending, error }
}
