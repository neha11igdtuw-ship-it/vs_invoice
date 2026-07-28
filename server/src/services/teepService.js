import prisma from '../lib/prisma.js'
import {
  D,
  calcCharge,
  calcDiscount,
  resolveDueDate,
  resolvePaymentStatus,
  sum,
  toMoney,
} from '../lib/money.js'
import { AppError } from '../lib/errors.js'
import { generateBillNumber, generateTeepNumber } from './serialService.js'

function calcCustomerTotals(customerInput, saleDate) {
  const items = customerInput.items || []
  const charges = customerInput.additionalCharges || []

  const itemRows = items.map((item) => ({
    goodsName: item.goodsName?.trim() || 'Item',
    quantity: toMoney(item.quantity || 0),
    unit: item.unit || 'Nag',
    rate: toMoney(item.rate || 0),
    amount: toMoney(D(item.quantity || 0).mul(D(item.rate || 0))),
    sortOrder: item.sortOrder || 0,
  }))

  const subtotal = sum(itemRows.map((item) => item.amount))
  const discountAmount = calcDiscount(
    subtotal,
    customerInput.discountType || 'fixed',
    customerInput.discountValue || 0,
  )
  const afterDiscount = D(subtotal).minus(discountAmount)

  const chargeRows = charges.map((charge) => {
    const amount = calcCharge(
      afterDiscount,
      charge.chargeType || 'fixed',
      charge.value || 0,
    )
    return {
      name: charge.name?.trim() || 'Charge',
      chargeType: charge.chargeType || 'fixed',
      value: toMoney(charge.value || 0),
      amount: toMoney(amount),
    }
  })

  const chargesTotal = sum(chargeRows.map((row) => row.amount))
  const netPayable = afterDiscount.plus(chargesTotal)
  const amountPaid = D(customerInput.amountPaid || 0)
  const remainingBalance = netPayable.minus(amountPaid)

  const dueDate = resolveDueDate(
    saleDate,
    customerInput.paymentDuration || 'immediate',
    customerInput.customDurationDays,
  )

  const paymentStatus = resolvePaymentStatus(
    netPayable,
    amountPaid,
    dueDate,
    customerInput.paymentStatus === 'cancelled',
  )

  return {
    itemRows,
    chargeRows,
    subtotal: toMoney(subtotal),
    discountAmount: toMoney(discountAmount),
    netPayable: toMoney(netPayable),
    remainingBalance: toMoney(remainingBalance),
    amountPaid: toMoney(amountPaid),
    paymentDueDate: dueDate,
    paymentStatus,
  }
}

export async function listTeeps({ financialYearId, search, dateFrom, dateTo, skip, take }) {
  const where = { financialYearId }
  if (dateFrom || dateTo) {
    where.saleDate = {}
    if (dateFrom) where.saleDate.gte = new Date(dateFrom)
    if (dateTo) where.saleDate.lte = new Date(dateTo)
  }
  if (search) {
    where.OR = [
      { teepNumber: { contains: search } },
      { customers: { some: { customerName: { contains: search } } } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.tEEP.findMany({
      where,
      include: {
        customers: {
          include: { items: true, additionalCharges: true, payments: true },
        },
      },
      orderBy: { saleDate: 'desc' },
      skip,
      take,
    }),
    prisma.tEEP.count({ where }),
  ])

  return { items, total }
}

export async function getTeep(id) {
  const teep = await prisma.tEEP.findUnique({
    where: { id },
    include: {
      financialYear: true,
      customers: {
        include: {
          items: { orderBy: { sortOrder: 'asc' } },
          additionalCharges: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      },
    },
  })
  if (!teep) throw new AppError('TEEP not found', 404)
  return teep
}

export async function createTeep(payload) {
  const { financialYearId, saleDate, remarks, customers } = payload
  if (!customers?.length) throw new AppError('At least one customer is required')

  return prisma.$transaction(async (tx) => {
    const teepNumber = await generateTeepNumber(financialYearId, tx)
    const sale = new Date(saleDate || Date.now())

    const teep = await tx.tEEP.create({
      data: {
        financialYearId,
        teepNumber,
        saleDate: sale,
        remarks: remarks || null,
      },
    })

    for (const customerInput of customers) {
      const billNumber = await generateBillNumber(financialYearId, tx)
      const totals = calcCustomerTotals(customerInput, sale)

      await tx.tEEPCustomer.create({
        data: {
          teepId: teep.id,
          billNumber,
          customerName: customerInput.customerName?.trim() || 'Customer',
          discountType: customerInput.discountType || 'fixed',
          discountValue: toMoney(customerInput.discountValue || 0),
          discountAmount: totals.discountAmount,
          subtotal: totals.subtotal,
          netPayable: totals.netPayable,
          amountPaid: totals.amountPaid,
          remainingBalance: totals.remainingBalance,
          paymentDuration: customerInput.paymentDuration || 'immediate',
          customDurationDays: customerInput.customDurationDays || null,
          paymentDueDate: totals.paymentDueDate,
          paymentStatus: totals.paymentStatus,
          remarks: customerInput.remarks || null,
          items: { create: totals.itemRows },
          additionalCharges: { create: totals.chargeRows },
          payments:
            D(customerInput.amountPaid || 0).gt(0)
              ? {
                  create: {
                    amount: totals.amountPaid,
                    paymentDate: sale,
                    remarks: 'Initial payment',
                  },
                }
              : undefined,
        },
      })
    }

    return getTeep(teep.id)
  })
}

export async function updateTeep(id, payload) {
  const existing = await getTeep(id)

  return prisma.$transaction(async (tx) => {
    await tx.tEEP.update({
      where: { id },
      data: {
        saleDate: payload.saleDate ? new Date(payload.saleDate) : undefined,
        remarks: payload.remarks,
      },
    })

    if (payload.customers) {
      await tx.tEEPCustomer.deleteMany({ where: { teepId: id } })

      const sale = payload.saleDate ? new Date(payload.saleDate) : existing.saleDate

      for (const customerInput of payload.customers) {
        const billNumber = customerInput.billNumber || (await generateBillNumber(existing.financialYearId, tx))
        const totals = calcCustomerTotals(customerInput, sale)

        await tx.tEEPCustomer.create({
          data: {
            teepId: id,
            billNumber,
            customerName: customerInput.customerName?.trim() || 'Customer',
            discountType: customerInput.discountType || 'fixed',
            discountValue: toMoney(customerInput.discountValue || 0),
            discountAmount: totals.discountAmount,
            subtotal: totals.subtotal,
            netPayable: totals.netPayable,
            amountPaid: totals.amountPaid,
            remainingBalance: totals.remainingBalance,
            paymentDuration: customerInput.paymentDuration || 'immediate',
            customDurationDays: customerInput.customDurationDays || null,
            paymentDueDate: totals.paymentDueDate,
            paymentStatus: totals.paymentStatus,
            remarks: customerInput.remarks || null,
            items: { create: totals.itemRows },
            additionalCharges: { create: totals.chargeRows },
            payments:
              D(customerInput.amountPaid || 0).gt(0)
                ? {
                    create: {
                      amount: totals.amountPaid,
                      paymentDate: sale,
                      remarks: 'Initial payment',
                    },
                  }
                : undefined,
          },
        })
      }
    }

    return getTeep(id)
  })
}

export async function deleteTeep(id) {
  return prisma.tEEP.delete({ where: { id } })
}

export function getTeepDailySummary(teep) {
  const customers = teep.customers || []
  const totalCustomers = customers.length
  const totalQuantity = sum(
    customers.flatMap((c) => c.items.map((item) => item.quantity)),
  )
  const grossSales = sum(customers.map((c) => c.subtotal))
  const totalDiscount = sum(customers.map((c) => c.discountAmount))
  const totalAdditional = sum(
    customers.flatMap((c) => c.additionalCharges.map((charge) => charge.amount)),
  )
  const netSales = sum(customers.map((c) => c.netPayable))
  const amountReceived = sum(customers.map((c) => c.amountPaid))
  const outstanding = sum(customers.map((c) => c.remainingBalance))

  return {
    totalCustomers,
    totalQuantity: toMoney(totalQuantity),
    grossSales: toMoney(grossSales),
    totalDiscount: toMoney(totalDiscount),
    totalAdditionalCharges: toMoney(totalAdditional),
    netSales: toMoney(netSales),
    amountReceived: toMoney(amountReceived),
    outstanding: toMoney(outstanding),
  }
}

export async function getTeepCustomerBill(customerId) {
  const customer = await prisma.tEEPCustomer.findUnique({
    where: { id: customerId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      additionalCharges: true,
      payments: true,
      teep: { include: { financialYear: true } },
    },
  })
  if (!customer) throw new AppError('TEEP customer bill not found', 404)
  return customer
}
