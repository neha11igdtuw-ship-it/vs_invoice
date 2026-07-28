import { EXPENSE_LABELS } from './constants'

export function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return 0
  const num = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(num) ? num : 0
}

export function formatCurrency(amount) {
  const value = Math.round(parseNumber(amount) * 100) / 100
  const [rupees, paise = '00'] = value.toFixed(2).split('.')
  return `${Number(rupees).toLocaleString('en-IN')}-${paise.padEnd(2, '0')}`
}

export function formatRate(amount) {
  const value = parseNumber(amount)
  if (!value) return ''
  return `${value.toLocaleString('en-IN')}/-`
}

export function calculateLineGross(quantity, rate) {
  return parseNumber(quantity) * parseNumber(rate)
}

export function parseTotalNags(invoice) {
  const override = parseNumber(invoice.totalNags)
  if (override > 0) return override

  const fromNagField = String(invoice.nag || '').match(/\d+/)
  if (fromNagField) return parseNumber(fromNagField[0])

  return invoice.lineItems.reduce(
    (sum, item) => sum + parseNumber(item.quantity),
    0,
  )
}

export function calculateAutoExpenses(invoice, grossTotal) {
  const totalNags = parseTotalNags(invoice)
  const labourPerNag = parseNumber(invoice.labourPerNag)
  const forwardingPercent = parseNumber(invoice.forwardingPercent)

  const labourAmount =
    invoice.labourAuto && labourPerNag > 0 && totalNags > 0
      ? labourPerNag * totalNags
      : null

  const forwardingAmount =
    invoice.forwardingAuto && forwardingPercent > 0 && grossTotal > 0
      ? (grossTotal * forwardingPercent) / 100
      : null

  return {
    totalNags,
    labourPerNag,
    forwardingPercent,
    labourAmount,
    forwardingAmount,
  }
}

export function calculateInvoiceTotals(invoice) {
  const lineItems = invoice.lineItems.map((item) => {
    const gross = calculateLineGross(item.quantity, item.rate)
    return { ...item, gross }
  })

  const grossTotal = lineItems.reduce((sum, item) => sum + item.gross, 0)
  const autoCalc = calculateAutoExpenses(invoice, grossTotal)

  const standardExpenses = EXPENSE_LABELS.map((name) => {
    let amount = parseNumber(invoice.expenses[name])
    let auto = false

    if (name === 'Labour & SST' && autoCalc.labourAmount !== null) {
      amount = autoCalc.labourAmount
      auto = true
    }

    if (name === 'Forwarding' && autoCalc.forwardingAmount !== null) {
      amount = autoCalc.forwardingAmount
      auto = true
    }

    return { name, amount, auto }
  })

  const extraExpenses = (invoice.extraExpenses || [])
    .filter((item) => {
      const hasAmount = parseNumber(item.amount) > 0
      const hasName = item.name.trim()
      const isSitDuplicate =
        invoice.forwardingAuto &&
        autoCalc.forwardingAmount !== null &&
        item.name.trim().toUpperCase() === 'SIT'

      return (hasName || hasAmount) && !isSitDuplicate
    })
    .map((item) => ({
      name: item.name.trim() || 'Other',
      amount: parseNumber(item.amount),
      auto: false,
    }))

  const allExpenses = [...standardExpenses, ...extraExpenses]
  const totalExpenses = allExpenses.reduce((sum, item) => sum + item.amount, 0)
  const netBalance = grossTotal - totalExpenses

  return {
    lineItems,
    grossTotal,
    totalExpenses,
    netBalance,
    allExpenses,
    autoCalc,
  }
}

export function getExpenseDisplayName(name) {
  if (name === 'Forwarding') {
    return 'SIT / Forwarding'
  }
  return name
}
