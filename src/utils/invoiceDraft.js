import { createInitialInvoice } from './constants'

const DRAFT_PREFIX = 'vs-invoice-draft'
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function draftKey(financialYearId) {
  return `${DRAFT_PREFIX}-${financialYearId || 'default'}`
}

export function hasDraftContent(invoice) {
  if (!invoice) return false
  if (invoice.customerName?.trim()) return true
  if (invoice.grNumber?.trim()) return true
  if (invoice.truckNumber?.trim()) return true
  if (invoice.challanNumber?.trim()) return true
  if (invoice.nag?.trim()) return true
  if (invoice.nagSummary?.trim()) return true
  if (invoice.labourPerNag?.trim()) return true
  if (invoice.forwardingPercent?.trim()) return true

  if (invoice.lineItems?.some((item) => item.description?.trim() || item.quantity || item.rate)) {
    return true
  }

  if (Object.values(invoice.expenses || {}).some((value) => String(value || '').trim())) {
    return true
  }

  if (invoice.extraExpenses?.some((item) => item.name?.trim() || item.amount)) {
    return true
  }

  return false
}

export function saveInvoiceDraft(financialYearId, invoice) {
  try {
    if (!hasDraftContent(invoice)) {
      clearInvoiceDraft(financialYearId)
      return
    }

    localStorage.setItem(
      draftKey(financialYearId),
      JSON.stringify({
        savedAt: Date.now(),
        invoice,
      }),
    )
  } catch {
    // Ignore storage errors on full devices.
  }
}

export function loadInvoiceDraft(financialYearId) {
  try {
    const raw = localStorage.getItem(draftKey(financialYearId))
    if (!raw) return null

    const data = JSON.parse(raw)
    if (!data?.invoice || Date.now() - data.savedAt > DRAFT_TTL_MS) {
      clearInvoiceDraft(financialYearId)
      return null
    }

    return data.invoice
  } catch {
    return null
  }
}

export function clearInvoiceDraft(financialYearId) {
  try {
    localStorage.removeItem(draftKey(financialYearId))
  } catch {
    // Ignore storage errors.
  }
}

export function restoreInvoiceDraft(financialYearId) {
  const draft = loadInvoiceDraft(financialYearId)
  if (!draft) return createInitialInvoice()
  return {
    ...createInitialInvoice(),
    ...draft,
    lineItems: draft.lineItems?.length ? draft.lineItems : createInitialInvoice().lineItems,
    expenses: { ...createInitialInvoice().expenses, ...draft.expenses },
    extraExpenses: draft.extraExpenses?.length
      ? draft.extraExpenses
      : createInitialInvoice().extraExpenses,
  }
}
