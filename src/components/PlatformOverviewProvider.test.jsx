import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { PlatformOverviewProvider, usePlatformOverview } from './PlatformOverviewProvider'

function Probe() {
  const { data } = usePlatformOverview()
  return <span>{data?.n ?? 'none'}</span>
}

describe('PlatformOverviewProvider refresh', () => {
  beforeEach(() => {
    let n = 0
    globalThis.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ n: ++n }),
    }))
  })

  test('refaz fetch ao receber p12-overview-refresh', async () => {
    render(
      <PlatformOverviewProvider url="/api/x">
        <Probe />
      </PlatformOverviewProvider>
    )
    await waitFor(() => expect(screen.getByText('1')).toBeInTheDocument())
    act(() => {
      window.dispatchEvent(new CustomEvent('p12-overview-refresh'))
    })
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
  })
})
