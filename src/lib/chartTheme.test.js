import { describe, it, expect } from 'vitest'
import { CHART_COLORS, chartColor } from './chartTheme'

describe('chartTheme', () => {
  it('exposes 6 hex colors', () => {
    expect(CHART_COLORS).toHaveLength(6)
    for (const c of CHART_COLORS) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
  it('chartColor wraps by index', () => {
    expect(chartColor(0)).toBe(CHART_COLORS[0])
    expect(chartColor(6)).toBe(CHART_COLORS[0])
    expect(chartColor(7)).toBe(CHART_COLORS[1])
  })
})
