import { parseNumber } from './calculations'

export function formatNagSummary(totalNags) {
  const n = parseNumber(totalNags)
  if (n <= 0) return ''
  return `Total NUG is equal to ${n} NUG`
}

export function resolveNagSummaryText(invoice, totalNags) {
  if (invoice.nagSummary?.trim()) return invoice.nagSummary.trim()
  return formatNagSummary(totalNags)
}
