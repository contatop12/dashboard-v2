import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCampaignStatusMutation } from './useCampaignStatusMutation'

describe('useCampaignStatusMutation', () => {
  beforeEach(() => { global.fetch = vi.fn() })

  it('POSTs and resolves ok on success', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    const { result } = renderHook(() => useCampaignStatusMutation('org1'))
    let ok
    await act(async () => { ok = await result.current.mutate({ level: 'campaign', id: 'c1', nextStatus: 'PAUSED' }) })
    expect(ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/platform/meta-campaign-status',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('resolves false and exposes error on failure', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'sem ads_management' }) })
    const { result } = renderHook(() => useCampaignStatusMutation('org1'))
    let ok
    await act(async () => { ok = await result.current.mutate({ level: 'campaign', id: 'c1', nextStatus: 'PAUSED' }) })
    expect(ok).toBe(false)
    expect(result.current.error).toMatch(/ads_management/)
  })
})
