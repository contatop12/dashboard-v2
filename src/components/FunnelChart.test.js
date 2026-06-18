import { describe, expect, it } from 'vitest'
import { funnelPercents } from './FunnelChart'

describe('funnelPercents', () => {
  const values = [6136, 226, 5, 5] // Impressão → Clique → Total Conv. → Primárias

  it('modo total: cada etapa relativa à primeira (comportamento legado)', () => {
    const p = funnelPercents(values, 'total')
    expect(p[0]).toBe(100)
    expect(p[1]).toBeCloseTo(3.68, 2)
    expect(p[2]).toBeCloseTo(0.0815, 3)
    expect(p[3]).toBeCloseTo(0.0815, 3)
  })

  it('modo step: cada etapa relativa à etapa anterior (perda entre métricas)', () => {
    const p = funnelPercents(values, 'step')
    expect(p[0]).toBe(100) // primeira etapa é a base
    expect(p[1]).toBeCloseTo(3.68, 2) // 226/6136
    expect(p[2]).toBeCloseTo(2.21, 2) // 5/226
    expect(p[3]).toBe(100) // 5/5
  })

  it('default é total', () => {
    expect(funnelPercents(values)).toEqual(funnelPercents(values, 'total'))
  })

  it('lida com zeros sem NaN/Infinity', () => {
    const p = funnelPercents([0, 0, 0], 'step')
    expect(p).toEqual([0, 0, 0])
    const t = funnelPercents([0, 5], 'total')
    expect(t[0]).toBe(0)
    expect(t[1]).toBe(0)
  })

  it('etapa anterior zerada não quebra step', () => {
    const p = funnelPercents([100, 0, 5], 'step')
    expect(p[0]).toBe(100)
    expect(p[1]).toBe(0)
    expect(p[2]).toBe(0) // prev=0 → 0, não Infinity
  })
})
