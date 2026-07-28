import prisma from '../lib/prisma.js'
import { D, sum, toMoney } from '../lib/money.js'
import { getTeepDailySummary } from './teepService.js'

export async function getDashboardSummary(financialYearId) {
  const [
    invoices,
    redBook,
    ledger,
    dayBook,
    arrivals,
    teeps,
    recentInvoices,
    recentTeeps,
  ] = await Promise.all([
    prisma.invoice.findMany({ where: { financialYearId, status: { not: 'cancelled' } } }),
    prisma.redBookEntry.findMany({ where: { financialYearId } }),
    prisma.ledgerEntry.findMany({ where: { financialYearId }, orderBy: { entryDate: 'asc' } }),
    prisma.dayBookEntry.findMany({ where: { financialYearId } }),
    prisma.arrival.findMany({ where: { financialYearId } }),
    prisma.tEEP.findMany({
      where: { financialYearId },
      include: { customers: { include: { items: true, additionalCharges: true } } },
    }),
    prisma.invoice.findMany({
      where: { financialYearId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        grandTotal: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.tEEP.findMany({
      where: { financialYearId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customers: true },
    }),
  ])

  const totalInvoiceAmount = sum(invoices.map((row) => row.grandTotal))
  const ledgerDebit = sum(ledger.map((row) => row.debit))
  const ledgerCredit = sum(ledger.map((row) => row.credit))

  let teepSales = new D(0)
  let totalReceived = new D(0)
  let totalOutstanding = new D(0)
  let overduePayments = 0

  for (const teep of teeps) {
    const summary = getTeepDailySummary(teep)
    teepSales = teepSales.plus(summary.netSales)
    totalReceived = totalReceived.plus(summary.amountReceived)
    totalOutstanding = totalOutstanding.plus(summary.outstanding)
    overduePayments += teep.customers.filter((c) => c.paymentStatus === 'overdue').length
  }

  return {
    totalInvoices: invoices.length,
    totalInvoiceAmount: toMoney(totalInvoiceAmount),
    ledgerDebit: toMoney(ledgerDebit),
    ledgerCredit: toMoney(ledgerCredit),
    dayBookEntries: dayBook.length,
    arrivalEntries: arrivals.length,
    redBookEntries: redBook.length,
    teepSales: toMoney(teepSales),
    totalReceived: toMoney(totalReceived),
    totalOutstanding: toMoney(totalOutstanding),
    overduePayments,
    recentActivity: [
      ...recentInvoices.map((row) => ({
        type: 'invoice',
        id: row.id,
        label: row.invoiceNumber,
        detail: row.customerName,
        amount: row.grandTotal,
        status: row.status,
        createdAt: row.createdAt,
      })),
      ...recentTeeps.map((row) => ({
        type: 'teep',
        id: row.id,
        label: row.teepNumber,
        detail: `${row.customers.length} customers`,
        amount: sum(row.customers.map((c) => c.netPayable)),
        status: 'active',
        createdAt: row.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8),
  }
}

export async function recalculateLedgerBalances(financialYearId, partyName) {
  const entries = await prisma.ledgerEntry.findMany({
    where: { financialYearId, partyName },
    orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
  })

  let balance = new D(0)
  for (const entry of entries) {
    balance = balance.plus(entry.debit).minus(entry.credit)
    await prisma.ledgerEntry.update({
      where: { id: entry.id },
      data: { runningBalance: toMoney(balance) },
    })
  }

  return balance
}
