import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value, options = {}) {
  const { compact = false, prefix = 'R$' } = options
  if (compact) {
    if (value >= 1000000) return `${prefix}${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${prefix}${(value / 1000).toFixed(2)}mil`
  }
  return `${prefix}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatNumber(value, compact = false) {
  if (compact) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(0)}mil`
  }
  return value.toLocaleString('pt-BR')
}

export function formatPercent(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`
}
