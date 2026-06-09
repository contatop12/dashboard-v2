import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricInfo } from './MetricInfo'

describe('MetricInfo', () => {
  it('renders an info trigger labelled by the metric', () => {
    render(<MetricInfo metricKey="ctrLink" />)
    // aria-label exposes the metric label so screen readers announce context
    expect(screen.getByLabelText(/CTR no link/i)).toBeInTheDocument()
  })

  it('renders nothing-breaking for unknown keys', () => {
    render(<MetricInfo metricKey="nope" />)
    expect(screen.getByLabelText(/nope/i)).toBeInTheDocument()
  })
})
