import prisma from '../lib/prisma.js'
import { AppError } from '../lib/errors.js'

export async function getActiveFinancialYear() {
  const active = await prisma.financialYear.findFirst({ where: { isActive: true } })
  if (!active) throw new AppError('No active financial year. Create and activate one first.', 400)
  return active
}

export async function generateInvoiceSerial(financialYearId, tx = prisma) {
  const fy = await tx.financialYear.findUnique({ where: { id: financialYearId } })
  if (!fy) throw new AppError('Financial year not found', 404)

  const last = await tx.invoice.findFirst({
    where: { financialYearId },
    orderBy: { serialNumber: 'desc' },
    select: { serialNumber: true },
  })

  const serialNumber = (last?.serialNumber ?? 0) + 1
  const invoiceNumber = `INV/${fy.name}/${String(serialNumber).padStart(4, '0')}`

  return { serialNumber, invoiceNumber, financialYear: fy }
}

export async function generateTeepNumber(financialYearId, tx = prisma) {
  const fy = await tx.financialYear.findUnique({ where: { id: financialYearId } })
  if (!fy) throw new AppError('Financial year not found', 404)

  const count = await tx.tEEP.count({ where: { financialYearId } })
  const next = count + 1
  return `TEEP/${fy.name}/${String(next).padStart(4, '0')}`
}

export async function generateBillNumber(financialYearId, tx = prisma) {
  const fy = await tx.financialYear.findUnique({ where: { id: financialYearId } })
  if (!fy) throw new AppError('Financial year not found', 404)

  const count = await tx.tEEPCustomer.count({
    where: { teep: { financialYearId } },
  })
  const next = count + 1
  return `BILL/${fy.name}/${String(next).padStart(4, '0')}`
}
