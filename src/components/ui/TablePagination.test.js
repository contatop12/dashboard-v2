import { describe, expect, it } from 'vitest'
import { computePageSlice } from './TablePagination'

describe('computePageSlice', () => {
  it('primeira página de 12 itens, 10 por página', () => {
    const s = computePageSlice(12, 1, 10)
    expect(s.totalPages).toBe(2)
    expect(s.start).toBe(0)
    expect(s.end).toBe(10)
    expect(s.rangeStart).toBe(1)
    expect(s.rangeEnd).toBe(10)
  })

  it('segunda página devolve o resto', () => {
    const s = computePageSlice(12, 2, 10)
    expect(s.safePage).toBe(2)
    expect(s.start).toBe(10)
    expect(s.end).toBe(12)
    expect(s.rangeStart).toBe(11)
    expect(s.rangeEnd).toBe(12)
  })

  it('menos itens que o tamanho → uma página só', () => {
    const s = computePageSlice(8, 1, 10)
    expect(s.totalPages).toBe(1)
    expect(s.rangeStart).toBe(1)
    expect(s.rangeEnd).toBe(8)
  })

  it('Todas mostra tudo em uma página', () => {
    const s = computePageSlice(50, 1, 'all')
    expect(s.totalPages).toBe(1)
    expect(s.end).toBe(50)
    expect(s.rangeEnd).toBe(50)
  })

  it('página fora do intervalo é clampada', () => {
    const s = computePageSlice(12, 99, 10)
    expect(s.safePage).toBe(2)
  })

  it('zero itens não quebra', () => {
    const s = computePageSlice(0, 1, 10)
    expect(s.totalPages).toBe(1)
    expect(s.rangeStart).toBe(0)
    expect(s.rangeEnd).toBe(0)
    expect(s.start).toBe(0)
  })

  it('tamanho inválido não gera divisão por zero', () => {
    const s = computePageSlice(10, 1, 0)
    expect(Number.isFinite(s.totalPages)).toBe(true)
    expect(s.totalPages).toBe(10)
  })
})
