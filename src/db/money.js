export function uid() {
  return crypto.randomUUID()
}

export function money(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0.00'
  return num.toFixed(2)
}

export function sum(values) {
  return values.reduce((acc, value) => acc + Number(value || 0), 0).toFixed(2)
}

export function calcDiscount(subtotal, type, value) {
  const base = Number(subtotal || 0)
  const val = Number(value || 0)
  if (type === 'percentage') return ((base * val) / 100).toFixed(2)
  return money(val)
}

export function calcCharge(baseAmount, type, value) {
  const base = Number(baseAmount || 0)
  const val = Number(value || 0)
  if (type === 'percentage') return ((base * val) / 100).toFixed(2)
  return money(val)
}

export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + Number(days || 0))
  return result.toISOString()
}

const DURATIONS = {
  immediate: 0,
  same_day: 0,
  '7_days': 7,
  '15_days': 15,
  '30_days': 30,
  '45_days': 45,
}

export function resolveDueDate(saleDate, duration, customDays) {
  if (duration === 'custom') return addDays(saleDate, customDays)
  return addDays(saleDate, DURATIONS[duration] ?? 0)
}

export function resolvePaymentStatus(netPayable, amountPaid, dueDate, cancelled = false) {
  if (cancelled) return 'cancelled'
  const net = Number(netPayable)
  const paid = Number(amountPaid)
  if (paid >= net && net > 0) return 'paid'
  if (paid > 0 && paid < net) return new Date() > new Date(dueDate) ? 'overdue' : 'partially_paid'
  if (net > 0 && paid === 0) return new Date() > new Date(dueDate) ? 'overdue' : 'unpaid'
  return 'paid'
}

export function paginate(items, page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}
