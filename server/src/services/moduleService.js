import prisma from '../lib/prisma.js'
import { D, toMoney } from '../lib/money.js'
import { AppError } from '../lib/errors.js'
import { recalculateLedgerBalances } from './dashboardService.js'

function buildListHandler(model, searchFields = []) {
  return async ({ financialYearId, search, dateFrom, dateTo, skip, take, orderBy = { createdAt: 'desc' } }) => {
    const where = { financialYearId }
    if (search && searchFields.length) {
      where.OR = searchFields.map((field) => ({ [field]: { contains: search } }))
    }
    if (dateFrom || dateTo) {
      const dateField = model === 'arrival' ? 'arrivalDate' : 'entryDate'
      where[dateField] = {}
      if (dateFrom) where[dateField].gte = new Date(dateFrom)
      if (dateTo) where[dateField].lte = new Date(dateTo)
    }

    const [items, total] = await Promise.all([
      prisma[model].findMany({ where, orderBy, skip, take }),
      prisma[model].count({ where }),
    ])
    return { items, total }
  }
}

export const listRedBook = buildListHandler('redBookEntry', ['partyName', 'recordNumber', 'description'])
export const listDayBook = buildListHandler('dayBookEntry', ['partyName', 'voucherNumber', 'description'])
export const listArrivals = buildListHandler('arrival', ['partyName', 'itemName', 'arrivalNumber'])

export async function listLedger({ financialYearId, search, dateFrom, dateTo, skip, take }) {
  const where = { financialYearId }
  if (search) where.partyName = { contains: search }
  if (dateFrom || dateTo) {
    where.entryDate = {}
    if (dateFrom) where.entryDate.gte = new Date(dateFrom)
    if (dateTo) where.entryDate.lte = new Date(dateTo)
  }

  const [items, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.ledgerEntry.count({ where }),
  ])

  return { items, total }
}

export async function createRedBook(data) {
  const amount = D(data.quantity).mul(D(data.rate))
  return prisma.redBookEntry.create({
    data: {
      financialYearId: data.financialYearId,
      entryDate: new Date(data.entryDate),
      recordNumber: data.recordNumber,
      partyName: data.partyName,
      description: data.description,
      quantity: toMoney(data.quantity || 0),
      rate: toMoney(data.rate || 0),
      amount: toMoney(amount),
      remarks: data.remarks,
    },
  })
}

export async function updateRedBook(id, data) {
  const amount = D(data.quantity).mul(D(data.rate))
  return prisma.redBookEntry.update({
    where: { id },
    data: {
      entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
      recordNumber: data.recordNumber,
      partyName: data.partyName,
      description: data.description,
      quantity: data.quantity != null ? toMoney(data.quantity) : undefined,
      rate: data.rate != null ? toMoney(data.rate) : undefined,
      amount: toMoney(amount),
      remarks: data.remarks,
    },
  })
}

export async function createLedgerEntry(data) {
  const entry = await prisma.ledgerEntry.create({
    data: {
      financialYearId: data.financialYearId,
      partyName: data.partyName,
      entryDate: new Date(data.entryDate),
      description: data.description,
      debit: toMoney(data.debit || 0),
      credit: toMoney(data.credit || 0),
      paymentStatus: data.paymentStatus || 'pending',
    },
  })
  await recalculateLedgerBalances(data.financialYearId, data.partyName)
  return entry
}

export async function updateLedgerEntry(id, data) {
  const existing = await prisma.ledgerEntry.findUnique({ where: { id } })
  if (!existing) throw new AppError('Ledger entry not found', 404)

  const entry = await prisma.ledgerEntry.update({
    where: { id },
    data: {
      partyName: data.partyName,
      entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
      description: data.description,
      debit: data.debit != null ? toMoney(data.debit) : undefined,
      credit: data.credit != null ? toMoney(data.credit) : undefined,
      paymentStatus: data.paymentStatus,
    },
  })

  await recalculateLedgerBalances(existing.financialYearId, entry.partyName)
  if (existing.partyName !== entry.partyName) {
    await recalculateLedgerBalances(existing.financialYearId, existing.partyName)
  }
  return entry
}

export async function createDayBookEntry(data) {
  return prisma.dayBookEntry.create({
    data: {
      financialYearId: data.financialYearId,
      entryDate: new Date(data.entryDate),
      voucherNumber: data.voucherNumber,
      transactionType: data.transactionType,
      partyName: data.partyName,
      description: data.description,
      debit: toMoney(data.debit || 0),
      credit: toMoney(data.credit || 0),
    },
  })
}

export async function updateDayBookEntry(id, data) {
  return prisma.dayBookEntry.update({
    where: { id },
    data: {
      entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
      voucherNumber: data.voucherNumber,
      transactionType: data.transactionType,
      partyName: data.partyName,
      description: data.description,
      debit: data.debit != null ? toMoney(data.debit) : undefined,
      credit: data.credit != null ? toMoney(data.credit) : undefined,
    },
  })
}

export async function createArrival(data) {
  const amount = D(data.quantity).mul(D(data.rate))
  return prisma.arrival.create({
    data: {
      financialYearId: data.financialYearId,
      arrivalNumber: data.arrivalNumber,
      arrivalDate: new Date(data.arrivalDate),
      partyName: data.partyName,
      itemName: data.itemName,
      quantity: toMoney(data.quantity || 0),
      rate: toMoney(data.rate || 0),
      amount: toMoney(amount),
      remarks: data.remarks,
    },
  })
}

export async function updateArrival(id, data) {
  const amount = D(data.quantity).mul(D(data.rate))
  return prisma.arrival.update({
    where: { id },
    data: {
      arrivalNumber: data.arrivalNumber,
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
      partyName: data.partyName,
      itemName: data.itemName,
      quantity: data.quantity != null ? toMoney(data.quantity) : undefined,
      rate: data.rate != null ? toMoney(data.rate) : undefined,
      amount: toMoney(amount),
      remarks: data.remarks,
    },
  })
}

export async function getDayBookDailyTotals(financialYearId, date) {
  const entries = await prisma.dayBookEntry.findMany({
    where: {
      financialYearId,
      entryDate: {
        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
      },
    },
  })

  const debitTotal = entries.reduce((acc, row) => acc.plus(row.debit), new D(0))
  const creditTotal = entries.reduce((acc, row) => acc.plus(row.credit), new D(0))

  return {
    entries,
    debitTotal: toMoney(debitTotal),
    creditTotal: toMoney(creditTotal),
  }
}

export async function deleteByModel(model, id) {
  return prisma[model].delete({ where: { id } })
}

export async function getByModel(model, id) {
  const row = await prisma[model].findUnique({ where: { id } })
  if (!row) throw new AppError('Record not found', 404)
  return row
}
