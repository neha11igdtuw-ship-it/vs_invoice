import { EXPENSE_LABELS } from './constants'

export function formStateToInvoicePayload(invoice, financialYearId) {
  const expenses = { ...invoice.expenses }
  for (const extra of invoice.extraExpenses || []) {
    if (extra.name?.trim()) {
      expenses[extra.name.trim()] = extra.amount || 0
    }
  }

  return {
    financialYearId,
    invoiceDate: parseFormDate(invoice.date),
    customerName: invoice.customerName,
    truckNumber: invoice.truckNumber,
    challanNumber: invoice.challanNumber,
    nag: invoice.nag,
    nagSummary: invoice.nagSummary,
    discount: 0,
    tax: 0,
    additionalCharges: 0,
    status: 'active',
    expensesJson: JSON.stringify(expenses),
    labourAuto: invoice.labourAuto,
    labourPerNag: invoice.labourPerNag || null,
    forwardingAuto: invoice.forwardingAuto,
    forwardingPercent: invoice.forwardingPercent || null,
    items: invoice.lineItems
      .filter((item) => item.description || item.quantity || item.rate)
      .map((item) => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
      })),
  }
}

function parseFormDate(value) {
  if (!value) return new Date().toISOString()
  const parts = String(value).split(/[/-]/)
  if (parts.length === 3) {
    const [day, month, year] = parts
    const fullYear = year.length === 2 ? `20${year}` : year
    return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString()
  }
  return new Date(value).toISOString()
}

export function dbInvoiceToFormState(invoice) {
  const expenses = invoice.expensesJson ? JSON.parse(invoice.expensesJson) : {}
  const standard = EXPENSE_LABELS.reduce((acc, label) => {
    acc[label] = expenses[label] != null ? String(expenses[label]) : ''
    return acc
  }, {})

  const extraExpenses = Object.entries(expenses)
    .filter(([key]) => !EXPENSE_LABELS.includes(key))
    .map(([name, amount]) => ({ id: crypto.randomUUID(), name, amount: String(amount) }))

  return {
    id: invoice.id,
    grNumber: String(invoice.serialNumber),
    invoiceNumber: invoice.invoiceNumber,
    date: new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
    customerName: invoice.customerName,
    truckNumber: invoice.truckNumber || '',
    challanNumber: invoice.challanNumber || '',
    nag: invoice.nag || '',
    totalNags: '',
    nagSummary: invoice.nagSummary || '',
    labourAuto: invoice.labourAuto,
    labourPerNag: invoice.labourPerNag ? String(invoice.labourPerNag) : '',
    forwardingAuto: invoice.forwardingAuto,
    forwardingPercent: invoice.forwardingPercent ? String(invoice.forwardingPercent) : '',
    lineItems: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      rate: String(item.rate),
    })),
    expenses: standard,
    extraExpenses: extraExpenses.length
      ? extraExpenses
      : [{ id: crypto.randomUUID(), name: '', amount: '' }],
    status: invoice.status,
  }
}
