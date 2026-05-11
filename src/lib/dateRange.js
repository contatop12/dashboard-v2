import { differenceInCalendarDays, endOfDay, startOfDay, subDays } from 'date-fns'

/** 7 dias imediatamente antes do início do período principal (fim = dia anterior ao start principal). */
export function defaultCompareSevenDaysBeforeMain(mainStartDate) {
  const s = startOfDay(mainStartDate)
  const compareEnd = endOfDay(subDays(s, 1))
  const compareStart = startOfDay(subDays(compareEnd, 6))
  return { start: compareStart, end: compareEnd }
}

/**
 * Intervalo inclusivo no calendário: start 00:00 e end 23:59:59.999.
 * @param {Date} startInput
 * @param {Date} endInput
 * @returns {{ start: Date, end: Date }}
 */
export function getPreviousPeriodOfSameLength(startInput, endInput) {
  const start = startOfDay(startInput)
  const end = endOfDay(endInput)
  const days = differenceInCalendarDays(end, start) + 1
  const prevEnd = endOfDay(subDays(start, 1))
  const prevStart = startOfDay(subDays(prevEnd, days - 1))
  return { start: prevStart, end: prevEnd }
}

/** Últimos N dias inclusive (hoje = fim). */
export function rangeLastNDays(n, now = new Date()) {
  const end = endOfDay(now)
  const start = startOfDay(subDays(end, n - 1))
  return { start, end }
}

/** Mês civil atual (início → fim). */
export function rangeThisMonth(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = startOfDay(new Date(y, m, 1))
  const end = endOfDay(new Date(y, m + 1, 0))
  return { start, end }
}
