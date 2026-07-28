import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function D(value) {
  if (value instanceof Decimal) return value
  if (value === null || value === undefined || value === '') return new Decimal(0)
  return new Decimal(value)
}

export function toMoney(value) {
  return D(value).toDecimalPlaces(2).toString()
}

export function toNumber(value) {
  return D(value).toNumber()
}

export function sum(values) {
  return values.reduce((acc, value) => acc.plus(D(value)), new D(0))
}

export function calcDiscount(subtotal, type, value) {
  const base = D(subtotal)
  const val = D(value)
  if (type === 'percentage') {
    return base.mul(val).div(100)
  }
  return val
}

export function calcCharge(baseAmount, type, value) {
  const base = D(baseAmount)
  const val = D(value)
  if (type === 'percentage') {
    return base.mul(val).div(100)
  }
  return val
}

export function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export const PAYMENT_DURATIONS = {
  immediate: 0,
  same_day: 0,
  '7_days': 7,
  '15_days': 15,
  '30_days': 30,
  '45_days': 45,
}

export function resolveDueDate(saleDate, duration, customDays) {
  if (duration === 'custom') {
    return addDays(saleDate, Number(customDays) || 0)
  }
  const days = PAYMENT_DURATIONS[duration] ?? 0
  return addDays(saleDate, days)
}

export function resolvePaymentStatus(netPayable, amountPaid, dueDate, cancelled = false) {
  if (cancelled) return 'cancelled'
  const net = D(netPayable)
  const paid = D(amountPaid)
  if (paid.gte(net) && net.gt(0)) return 'paid'
  if (paid.gt(0) && paid.lt(net)) {
    if (new Date() > new Date(dueDate)) return 'overdue'
    return 'partially_paid'
  }
  if (net.gt(0) && paid.eq(0)) {
    if (new Date() > new Date(dueDate)) return 'overdue'
    return 'unpaid'
  }
  return 'paid'
}
