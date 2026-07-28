import prisma from '../lib/prisma.js'
import { D, sum, toMoney } from '../lib/money.js'
import { AppError } from '../lib/errors.js'
import { generateInvoiceSerial } from './serialService.js'

function calcLineAmount(quantity, rate) {
  return D(quantity).mul(D(rate))
}

function calcInvoiceTotals(items, expenses, discount, tax, additionalCharges) {
  const grossTotal = sum(items.map((item) => calcLineAmount(item.quantity, item.rate)))
  const totalExpenses = sum(Object.values(expenses || {}).map((v) => D(v)))
  const discountAmt = D(discount || 0)
  const taxAmt = D(tax || 0)
  const extraAmt = D(additionalCharges || 0)
  const grandTotal = grossTotal.minus(totalExpenses).minus(discountAmt).plus(taxAmt).plus(extraAmt)

  return {
    grossTotal: toMoney(grossTotal),
    totalExpenses: toMoney(totalExpenses),
    grandTotal: toMoney(grandTotal),
  }
}

export async function listInvoices({ financialYearId, search, status, dateFrom, dateTo, skip, take }) {
  const where = { financialYearId }
  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { invoiceNumber: { contains: search } },
      { truckNumber: { contains: search } },
    ]
  }
  if (status) where.status = status
  if (dateFrom || dateTo) {
    where.invoiceDate = {}
    if (dateFrom) where.invoiceDate.gte = new Date(dateFrom)
    if (dateTo) where.invoiceDate.lte = new Date(dateTo)
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { serialNumber: 'desc' },
      skip,
      take,
    }),
    prisma.invoice.count({ where }),
  ])

  return { items, total }
}

export async function getInvoice(id) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: 'asc' } }, financialYear: true },
  })
  if (!invoice) throw new AppError('Invoice not found', 404)
  return invoice
}

export async function createInvoice(payload) {
  const {
    financialYearId,
    invoiceDate,
    customerName,
    customerPhone,
    customerAddress,
    truckNumber,
    challanNumber,
    nag,
    nagSummary,
    discount,
    tax,
    additionalCharges,
    status,
    expensesJson,
    labourAuto,
    labourPerNag,
    forwardingAuto,
    forwardingPercent,
    items,
  } = payload

  if (!customerName?.trim()) throw new AppError('Customer name is required')
  if (!items?.length) throw new AppError('At least one item is required')

  const expenses = expensesJson ? JSON.parse(expensesJson) : {}
  const totals = calcInvoiceTotals(items, expenses, discount, tax, additionalCharges)

  return prisma.$transaction(async (tx) => {
    const { serialNumber, invoiceNumber } = await generateInvoiceSerial(financialYearId, tx)

    return tx.invoice.create({
      data: {
        financialYearId,
        serialNumber,
        invoiceNumber,
        invoiceDate: new Date(invoiceDate || Date.now()),
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        customerAddress: customerAddress || null,
        truckNumber: truckNumber || null,
        challanNumber: challanNumber || null,
        nag: nag || null,
        nagSummary: nagSummary || null,
        discount: toMoney(discount || 0),
        tax: toMoney(tax || 0),
        additionalCharges: toMoney(additionalCharges || 0),
        grossTotal: totals.grossTotal,
        totalExpenses: totals.totalExpenses,
        grandTotal: totals.grandTotal,
        status: status || 'active',
        expensesJson: expensesJson || null,
        labourAuto: Boolean(labourAuto),
        labourPerNag: labourPerNag != null ? toMoney(labourPerNag) : null,
        forwardingAuto: Boolean(forwardingAuto),
        forwardingPercent: forwardingPercent != null ? toMoney(forwardingPercent) : null,
        items: {
          create: items.map((item, index) => ({
            description: item.description?.trim() || 'Item',
            quantity: toMoney(item.quantity || 0),
            rate: toMoney(item.rate || 0),
            amount: toMoney(calcLineAmount(item.quantity, item.rate)),
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    })
  })
}

export async function updateInvoice(id, payload) {
  const existing = await getInvoice(id)
  if (existing.status === 'cancelled') throw new AppError('Cancelled invoice cannot be edited')

  const items = payload.items || existing.items
  const expenses = payload.expensesJson
    ? JSON.parse(payload.expensesJson)
    : existing.expensesJson
      ? JSON.parse(existing.expensesJson)
      : {}

  const totals = calcInvoiceTotals(
    items,
    expenses,
    payload.discount ?? existing.discount,
    payload.tax ?? existing.tax,
    payload.additionalCharges ?? existing.additionalCharges,
  )

  return prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })

    return tx.invoice.update({
      where: { id },
      data: {
        invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : undefined,
        customerName: payload.customerName?.trim(),
        customerPhone: payload.customerPhone,
        customerAddress: payload.customerAddress,
        truckNumber: payload.truckNumber,
        challanNumber: payload.challanNumber,
        nag: payload.nag,
        nagSummary: payload.nagSummary,
        discount: payload.discount != null ? toMoney(payload.discount) : undefined,
        tax: payload.tax != null ? toMoney(payload.tax) : undefined,
        additionalCharges:
          payload.additionalCharges != null ? toMoney(payload.additionalCharges) : undefined,
        grossTotal: totals.grossTotal,
        totalExpenses: totals.totalExpenses,
        grandTotal: totals.grandTotal,
        status: payload.status,
        expensesJson: payload.expensesJson,
        labourAuto: payload.labourAuto,
        labourPerNag: payload.labourPerNag != null ? toMoney(payload.labourPerNag) : undefined,
        forwardingAuto: payload.forwardingAuto,
        forwardingPercent:
          payload.forwardingPercent != null ? toMoney(payload.forwardingPercent) : undefined,
        items: {
          create: items.map((item, index) => ({
            description: item.description?.trim() || 'Item',
            quantity: toMoney(item.quantity || 0),
            rate: toMoney(item.rate || 0),
            amount: toMoney(calcLineAmount(item.quantity, item.rate)),
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    })
  })
}

export async function cancelInvoice(id) {
  return prisma.invoice.update({
    where: { id },
    data: { status: 'cancelled' },
  })
}

export async function deleteInvoice(id) {
  return prisma.invoice.delete({ where: { id } })
}

export function invoiceToFormState(invoice) {
  return {
    id: invoice.id,
    grNumber: String(invoice.serialNumber),
    invoiceNumber: invoice.invoiceNumber,
    date: new Date(invoice.invoiceDate).toLocaleDateString('en-IN'),
    customerName: invoice.customerName,
    truckNumber: invoice.truckNumber || '',
    challanNumber: invoice.challanNumber || '',
    nag: invoice.nag || '',
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
    expenses: invoice.expensesJson ? JSON.parse(invoice.expensesJson) : {},
    extraExpenses: [],
    status: invoice.status,
  }
}
