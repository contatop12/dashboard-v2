import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './Switch'

describe('Switch', () => {
  it('renders with role switch and aria-checked', () => {
    render(<Switch checked aria-label="Status" onCheckedChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Status' })
    expect(sw).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onCheckedChange with the next value on click', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} aria-label="Status" onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled', async () => {
    const onChange = vi.fn()
    render(<Switch checked={false} disabled aria-label="Status" onCheckedChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is busy and non-interactive when loading', async () => {
    const onChange = vi.fn()
    render(<Switch checked loading aria-label="Status" onCheckedChange={onChange} />)
    const sw = screen.getByRole('switch')
    expect(sw).toHaveAttribute('aria-busy', 'true')
    await userEvent.click(sw)
    expect(onChange).not.toHaveBeenCalled()
  })
})
