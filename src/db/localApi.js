import {
  boolToInt,
  initLocalDb,
  intToBool,
  nowIso,
  query,
  run,
} from './localDb.js'
import {
  calcCharge,
  calcDiscount,
  money,
  paginate,
  resolveDueDate,
  resolvePaymentStatus,
  sum,
  uid,
} from './money.js'
import { dbInvoiceToFormState } from '../utils/invoiceMapper.js'

async function ensureDb() {
  await initLocalDb()
}

function calcInvoiceTotals(items, expensesJson, discount = 0, tax = 0, additionalCharges = 0) {
  const expenses = expensesJson ? JSON.parse(expensesJson) : {}
  const grossTotal = sum(items.map((item) => Number(item.quantity) * Number(item.rate)))
  const totalExpenses = sum(Object.values(expenses).map((v) => Number(v)))
  const grandTotal = (
    Number(grossTotal) -
    Number(totalExpenses) -
    Number(discount || 0) +
    Number(tax || 0) +
    Number(additionalCharges || 0)
  ).toFixed(2)
  return { grossTotal, totalExpenses, grandTotal }
}

async function getFinancialYear(financialYearId) {
  const rows = await query('SELECT * FROM FinancialYear WHERE id = ?', [financialYearId])
  if (!rows[0]) throw new Error('Financial year not found')
  return rows[0]
}

async function recalcLedger(financialYearId, partyName) {
  const entries = await query(
    `SELECT * FROM LedgerEntry WHERE financialYearId = ? AND partyName = ? ORDER BY entryDate ASC, createdAt ASC`,
    [financialYearId, partyName],
  )
  let balance = 0
  for (const entry of entries) {
    balance += Number(entry.debit) - Number(entry.credit)
    await run('UPDATE LedgerEntry SET runningBalance = ? WHERE id = ?', [money(balance), entry.id])
  }
}

function mapFinancialYear(row) {
  return { ...row, isActive: intToBool(row.isActive) }
}

function mapInvoice(row, items = []) {
  if (!row) return null
  return {
    ...row,
    labourAuto: intToBool(row.labourAuto),
    forwardingAuto: intToBool(row.forwardingAuto),
    items,
  }
}

async function loadInvoiceItems(invoiceId) {
  return query('SELECT * FROM InvoiceItem WHERE invoiceId = ? ORDER BY sortOrder ASC', [invoiceId])
}

async function loadTeepCustomers(teepId) {
  const customers = await query('SELECT * FROM TEEPCustomer WHERE teepId = ?', [teepId])
  return Promise.all(
    customers.map(async (customer) => ({
      ...customer,
      items: await query('SELECT * FROM TEEPItem WHERE customerId = ? ORDER BY sortOrder ASC', [
        customer.id,
      ]),
      additionalCharges: await query(
        'SELECT * FROM TEEPAdditionalCharge WHERE customerId = ?',
        [customer.id],
      ),
      payments: await query('SELECT * FROM TEEPPayment WHERE customerId = ?', [customer.id]),
    })),
  )
}

function calcTeepCustomer(customerInput, saleDate) {
  const items = (customerInput.items || []).map((item, index) => ({
    goodsName: item.goodsName?.trim() || 'Item',
    quantity: money(item.quantity),
    unit: item.unit || 'Nag',
    rate: money(item.rate),
    amount: money(Number(item.quantity || 0) * Number(item.rate || 0)),
    sortOrder: index,
  }))
  const subtotal = sum(items.map((item) => item.amount))
  const discountAmount = calcDiscount(
    subtotal,
    customerInput.discountType || 'fixed',
    customerInput.discountValue || 0,
  )
  const afterDiscount = Number(subtotal) - Number(discountAmount)
  const chargeRows = (customerInput.additionalCharges || []).map((charge) => ({
    name: charge.name?.trim() || 'Charge',
    chargeType: charge.chargeType || 'fixed',
    value: money(charge.value),
    amount: calcCharge(afterDiscount, charge.chargeType || 'fixed', charge.value || 0),
  }))
  const netPayable = (
    afterDiscount + sum(chargeRows.map((row) => row.amount))
  ).toFixed(2)
  const amountPaid = money(customerInput.amountPaid || 0)
  const remainingBalance = (Number(netPayable) - Number(amountPaid)).toFixed(2)
  const paymentDueDate = resolveDueDate(
    saleDate,
    customerInput.paymentDuration || 'immediate',
    customerInput.customDurationDays,
  )
  const paymentStatus = resolvePaymentStatus(
    netPayable,
    amountPaid,
    paymentDueDate,
    customerInput.paymentStatus === 'cancelled',
  )
  return {
    items,
    chargeRows,
    subtotal,
    discountAmount,
    netPayable,
    amountPaid,
    remainingBalance,
    paymentDueDate,
    paymentStatus,
  }
}

function getTeepDailySummary(customers) {
  return {
    totalCustomers: customers.length,
    totalQuantity: sum(customers.flatMap((c) => c.items.map((item) => item.quantity))),
    grossSales: sum(customers.map((c) => c.subtotal)),
    totalDiscount: sum(customers.map((c) => c.discountAmount)),
    totalAdditionalCharges: sum(
      customers.flatMap((c) => c.additionalCharges.map((charge) => charge.amount)),
    ),
    netSales: sum(customers.map((c) => c.netPayable)),
    amountReceived: sum(customers.map((c) => c.amountPaid)),
    outstanding: sum(customers.map((c) => c.remainingBalance)),
  }
}

export const localApi = {
  async getDashboardSummary(financialYearId) {
    await ensureDb()
    const invoices = await query(
      `SELECT * FROM Invoice WHERE financialYearId = ? AND status != 'cancelled'`,
      [financialYearId],
    )
    const ledger = await query('SELECT * FROM LedgerEntry WHERE financialYearId = ?', [
      financialYearId,
    ])
    const dayBook = await query('SELECT id FROM DayBookEntry WHERE financialYearId = ?', [
      financialYearId,
    ])
    const arrivals = await query('SELECT id FROM Arrival WHERE financialYearId = ?', [
      financialYearId,
    ])
    const redBook = await query('SELECT id FROM RedBookEntry WHERE financialYearId = ?', [
      financialYearId,
    ])
    const teeps = await query('SELECT * FROM TEEP WHERE financialYearId = ?', [financialYearId])

    let teepSales = 0
    let totalReceived = 0
    let totalOutstanding = 0
    let overduePayments = 0
    for (const teep of teeps) {
      const customers = await loadTeepCustomers(teep.id)
      const summary = getTeepDailySummary(customers)
      teepSales += Number(summary.netSales)
      totalReceived += Number(summary.amountReceived)
      totalOutstanding += Number(summary.outstanding)
      overduePayments += customers.filter((c) => c.paymentStatus === 'overdue').length
    }

    const recentInvoices = await query(
      `SELECT id, invoiceNumber, customerName, grandTotal, status, createdAt
       FROM Invoice WHERE financialYearId = ? ORDER BY createdAt DESC LIMIT 5`,
      [financialYearId],
    )

    return {
      totalInvoices: invoices.length,
      totalInvoiceAmount: sum(invoices.map((row) => row.grandTotal)),
      ledgerDebit: sum(ledger.map((row) => row.debit)),
      ledgerCredit: sum(ledger.map((row) => row.credit)),
      dayBookEntries: dayBook.length,
      arrivalEntries: arrivals.length,
      redBookEntries: redBook.length,
      teepSales: money(teepSales),
      totalReceived: money(totalReceived),
      totalOutstanding: money(totalOutstanding),
      overduePayments,
      recentActivity: recentInvoices.map((row) => ({
        type: 'invoice',
        id: row.id,
        label: row.invoiceNumber,
        detail: row.customerName,
        amount: row.grandTotal,
        status: row.status,
        createdAt: row.createdAt,
      })),
    }
  },

  async getFinancialYears() {
    await ensureDb()
    const rows = await query('SELECT * FROM FinancialYear ORDER BY startDate DESC')
    return rows.map(mapFinancialYear)
  },

  async createFinancialYear(body) {
    await ensureDb()
    if (body.isActive) await run('UPDATE FinancialYear SET isActive = 0')
    const id = uid()
    const now = nowIso()
    await run(
      `INSERT INTO FinancialYear (id, name, startDate, endDate, isActive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, body.name, body.startDate, body.endDate, boolToInt(body.isActive), now],
    )
    return mapFinancialYear(
      (
        await query('SELECT * FROM FinancialYear WHERE id = ?', [id])
      )[0],
    )
  },

  async activateFinancialYear(id) {
    await ensureDb()
    await run('UPDATE FinancialYear SET isActive = 0')
    await run('UPDATE FinancialYear SET isActive = 1 WHERE id = ?', [id])
    return mapFinancialYear((await query('SELECT * FROM FinancialYear WHERE id = ?', [id]))[0])
  },

  async listInvoices(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM Invoice WHERE financialYearId = ? ORDER BY serialNumber DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.customerName?.toLowerCase().includes(s) ||
          row.invoiceNumber?.toLowerCase().includes(s) ||
          row.truckNumber?.toLowerCase().includes(s),
      )
    }
    if (params.status) rows = rows.filter((row) => row.status === params.status)
    const paged = paginate(rows, params.page, params.pageSize)
    paged.items = await Promise.all(
      paged.items.map(async (row) => mapInvoice(row, await loadInvoiceItems(row.id))),
    )
    return paged
  },

  async getInvoice(id) {
    await ensureDb()
    const row = (await query('SELECT * FROM Invoice WHERE id = ?', [id]))[0]
    if (!row) throw new Error('Invoice not found')
    return mapInvoice(row, await loadInvoiceItems(id))
  },

  async getInvoiceFormState(id) {
    const invoice = await this.getInvoice(id)
    return dbInvoiceToFormState(invoice)
  },

  async createInvoice(body) {
    await ensureDb()
    if (!body.customerName?.trim()) throw new Error('Customer name is required')
    if (!body.items?.length) throw new Error('At least one item is required')

    const fy = await getFinancialYear(body.financialYearId)
    const totals = calcInvoiceTotals(
      body.items,
      body.expensesJson,
      body.discount,
      body.tax,
      body.additionalCharges,
    )
    const id = uid()
    const now = nowIso()

    const last = await query(
      'SELECT MAX(serialNumber) as serialNumber FROM Invoice WHERE financialYearId = ?',
      [body.financialYearId],
    )
    const serialNumber = Number(last[0]?.serialNumber || 0) + 1
    const invoiceNumber = `INV/${fy.name}/${String(serialNumber).padStart(4, '0')}`

    await run(
      `INSERT INTO Invoice (
        id, financialYearId, serialNumber, invoiceNumber, invoiceDate, customerName,
        customerPhone, customerAddress, truckNumber, challanNumber, nag, nagSummary,
        discount, tax, additionalCharges, grossTotal, totalExpenses, grandTotal, status,
        expensesJson, labourAuto, labourPerNag, forwardingAuto, forwardingPercent, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.financialYearId,
        serialNumber,
        invoiceNumber,
        body.invoiceDate || now,
        body.customerName.trim(),
        body.customerPhone || null,
        body.customerAddress || null,
        body.truckNumber || null,
        body.challanNumber || null,
        body.nag || null,
        body.nagSummary || null,
        money(body.discount),
        money(body.tax),
        money(body.additionalCharges),
        totals.grossTotal,
        totals.totalExpenses,
        totals.grandTotal,
        body.status || 'active',
        body.expensesJson || null,
        boolToInt(body.labourAuto),
        body.labourPerNag != null ? money(body.labourPerNag) : null,
        boolToInt(body.forwardingAuto),
        body.forwardingPercent != null ? money(body.forwardingPercent) : null,
        now,
        now,
      ],
    )

    for (const [index, item] of body.items.entries()) {
      await run(
        `INSERT INTO InvoiceItem (id, invoiceId, description, quantity, rate, amount, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid(),
          id,
          item.description?.trim() || 'Item',
          money(item.quantity),
          money(item.rate),
          money(Number(item.quantity || 0) * Number(item.rate || 0)),
          index,
        ],
      )
    }

    return this.getInvoice(id)
  },

  async updateInvoice(id, body) {
    await ensureDb()
    const existing = await this.getInvoice(id)
    if (existing.status === 'cancelled') throw new Error('Cancelled invoice cannot be edited')
    const items = body.items || existing.items
    const totals = calcInvoiceTotals(
      items,
      body.expensesJson ?? existing.expensesJson,
      body.discount ?? existing.discount,
      body.tax ?? existing.tax,
      body.additionalCharges ?? existing.additionalCharges,
    )
    const now = nowIso()
    await run(
      `UPDATE Invoice SET
        invoiceDate = ?, customerName = ?, customerPhone = ?, customerAddress = ?,
        truckNumber = ?, challanNumber = ?, nag = ?, nagSummary = ?, discount = ?, tax = ?,
        additionalCharges = ?, grossTotal = ?, totalExpenses = ?, grandTotal = ?, status = ?,
        expensesJson = ?, labourAuto = ?, labourPerNag = ?, forwardingAuto = ?, forwardingPercent = ?,
        updatedAt = ?
      WHERE id = ?`,
      [
        body.invoiceDate || existing.invoiceDate,
        body.customerName?.trim() || existing.customerName,
        body.customerPhone ?? existing.customerPhone,
        body.customerAddress ?? existing.customerAddress,
        body.truckNumber ?? existing.truckNumber,
        body.challanNumber ?? existing.challanNumber,
        body.nag ?? existing.nag,
        body.nagSummary ?? existing.nagSummary,
        money(body.discount ?? existing.discount),
        money(body.tax ?? existing.tax),
        money(body.additionalCharges ?? existing.additionalCharges),
        totals.grossTotal,
        totals.totalExpenses,
        totals.grandTotal,
        body.status ?? existing.status,
        body.expensesJson ?? existing.expensesJson,
        boolToInt(body.labourAuto ?? existing.labourAuto),
        body.labourPerNag != null ? money(body.labourPerNag) : existing.labourPerNag,
        boolToInt(body.forwardingAuto ?? existing.forwardingAuto),
        body.forwardingPercent != null
          ? money(body.forwardingPercent)
          : existing.forwardingPercent,
        now,
        id,
      ],
    )
    await run('DELETE FROM InvoiceItem WHERE invoiceId = ?', [id])
    for (const [index, item] of items.entries()) {
      await run(
        `INSERT INTO InvoiceItem (id, invoiceId, description, quantity, rate, amount, sortOrder)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uid(),
          id,
          item.description?.trim() || 'Item',
          money(item.quantity),
          money(item.rate),
          money(Number(item.quantity || 0) * Number(item.rate || 0)),
          index,
        ],
      )
    }
    return this.getInvoice(id)
  },

  async cancelInvoice(id) {
    await ensureDb()
    await run(`UPDATE Invoice SET status = 'cancelled', updatedAt = ? WHERE id = ?`, [
      nowIso(),
      id,
    ])
    return this.getInvoice(id)
  },

  async deleteInvoice(id) {
    await ensureDb()
    await run('DELETE FROM InvoiceItem WHERE invoiceId = ?', [id])
    await run('DELETE FROM Invoice WHERE id = ?', [id])
    return null
  },

  async listRedBook(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM RedBookEntry WHERE financialYearId = ? ORDER BY entryDate DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.partyName?.toLowerCase().includes(s) ||
          row.recordNumber?.toLowerCase().includes(s) ||
          row.description?.toLowerCase().includes(s),
      )
    }
    return paginate(rows, params.page, params.pageSize)
  },

  async createRedBook(body) {
    await ensureDb()
    const id = uid()
    const now = nowIso()
    const amount = money(Number(body.quantity) * Number(body.rate))
    await run(
      `INSERT INTO RedBookEntry (id, financialYearId, entryDate, recordNumber, partyName, description, quantity, rate, amount, remarks, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.financialYearId,
        body.entryDate,
        body.recordNumber,
        body.partyName,
        body.description || null,
        money(body.quantity),
        money(body.rate),
        amount,
        body.remarks || null,
        now,
        now,
      ],
    )
    return (await query('SELECT * FROM RedBookEntry WHERE id = ?', [id]))[0]
  },

  async updateRedBook(id, body) {
    await ensureDb()
    const amount = money(Number(body.quantity) * Number(body.rate))
    await run(
      `UPDATE RedBookEntry SET entryDate = ?, recordNumber = ?, partyName = ?, description = ?, quantity = ?, rate = ?, amount = ?, remarks = ?, updatedAt = ? WHERE id = ?`,
      [
        body.entryDate,
        body.recordNumber,
        body.partyName,
        body.description || null,
        money(body.quantity),
        money(body.rate),
        amount,
        body.remarks || null,
        nowIso(),
        id,
      ],
    )
    return (await query('SELECT * FROM RedBookEntry WHERE id = ?', [id]))[0]
  },

  async deleteRedBook(id) {
    await ensureDb()
    await run('DELETE FROM RedBookEntry WHERE id = ?', [id])
    return null
  },

  async listLedger(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM LedgerEntry WHERE financialYearId = ? ORDER BY entryDate DESC, createdAt DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      rows = rows.filter((row) => row.partyName?.toLowerCase().includes(s))
    }
    return paginate(rows, params.page, params.pageSize)
  },

  async createLedger(body) {
    await ensureDb()
    const id = uid()
    const now = nowIso()
    await run(
      `INSERT INTO LedgerEntry (id, financialYearId, partyName, entryDate, description, debit, credit, runningBalance, paymentStatus, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, '0.00', ?, ?, ?)`,
      [
        id,
        body.financialYearId,
        body.partyName,
        body.entryDate,
        body.description || null,
        money(body.debit),
        money(body.credit),
        body.paymentStatus || 'pending',
        now,
        now,
      ],
    )
    await recalcLedger(body.financialYearId, body.partyName)
    return (await query('SELECT * FROM LedgerEntry WHERE id = ?', [id]))[0]
  },

  async updateLedger(id, body) {
    await ensureDb()
    const existing = (await query('SELECT * FROM LedgerEntry WHERE id = ?', [id]))[0]
    await run(
      `UPDATE LedgerEntry SET partyName = ?, entryDate = ?, description = ?, debit = ?, credit = ?, paymentStatus = ?, updatedAt = ? WHERE id = ?`,
      [
        body.partyName,
        body.entryDate,
        body.description || null,
        money(body.debit),
        money(body.credit),
        body.paymentStatus || existing.paymentStatus,
        nowIso(),
        id,
      ],
    )
    await recalcLedger(existing.financialYearId, body.partyName)
    if (existing.partyName !== body.partyName) {
      await recalcLedger(existing.financialYearId, existing.partyName)
    }
    return (await query('SELECT * FROM LedgerEntry WHERE id = ?', [id]))[0]
  },

  async deleteLedger(id) {
    await ensureDb()
    const existing = (await query('SELECT * FROM LedgerEntry WHERE id = ?', [id]))[0]
    await run('DELETE FROM LedgerEntry WHERE id = ?', [id])
    if (existing) await recalcLedger(existing.financialYearId, existing.partyName)
    return null
  },

  async listDayBook(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM DayBookEntry WHERE financialYearId = ? ORDER BY entryDate DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.partyName?.toLowerCase().includes(s) ||
          row.voucherNumber?.toLowerCase().includes(s) ||
          row.description?.toLowerCase().includes(s),
      )
    }
    return paginate(rows, params.page, params.pageSize)
  },

  async getDayBookDailyTotals(financialYearId, date) {
    await ensureDb()
    const entries = await query(
      `SELECT * FROM DayBookEntry WHERE financialYearId = ? AND entryDate LIKE ?`,
      [financialYearId, `${date.slice(0, 10)}%`],
    )
    return {
      entries,
      debitTotal: sum(entries.map((row) => row.debit)),
      creditTotal: sum(entries.map((row) => row.credit)),
    }
  },

  async createDayBook(body) {
    await ensureDb()
    const id = uid()
    const now = nowIso()
    await run(
      `INSERT INTO DayBookEntry (id, financialYearId, entryDate, voucherNumber, transactionType, partyName, description, debit, credit, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.financialYearId,
        body.entryDate,
        body.voucherNumber,
        body.transactionType,
        body.partyName,
        body.description || null,
        money(body.debit),
        money(body.credit),
        now,
        now,
      ],
    )
    return (await query('SELECT * FROM DayBookEntry WHERE id = ?', [id]))[0]
  },

  async updateDayBook(id, body) {
    await ensureDb()
    await run(
      `UPDATE DayBookEntry SET entryDate = ?, voucherNumber = ?, transactionType = ?, partyName = ?, description = ?, debit = ?, credit = ?, updatedAt = ? WHERE id = ?`,
      [
        body.entryDate,
        body.voucherNumber,
        body.transactionType,
        body.partyName,
        body.description || null,
        money(body.debit),
        money(body.credit),
        nowIso(),
        id,
      ],
    )
    return (await query('SELECT * FROM DayBookEntry WHERE id = ?', [id]))[0]
  },

  async deleteDayBook(id) {
    await ensureDb()
    await run('DELETE FROM DayBookEntry WHERE id = ?', [id])
    return null
  },

  async listArrivals(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM Arrival WHERE financialYearId = ? ORDER BY arrivalDate DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.partyName?.toLowerCase().includes(s) ||
          row.itemName?.toLowerCase().includes(s) ||
          row.arrivalNumber?.toLowerCase().includes(s),
      )
    }
    return paginate(rows, params.page, params.pageSize)
  },

  async createArrival(body) {
    await ensureDb()
    const id = uid()
    const now = nowIso()
    const amount = money(Number(body.quantity) * Number(body.rate))
    await run(
      `INSERT INTO Arrival (id, financialYearId, arrivalNumber, arrivalDate, partyName, itemName, quantity, rate, amount, remarks, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.financialYearId,
        body.arrivalNumber,
        body.arrivalDate,
        body.partyName,
        body.itemName,
        money(body.quantity),
        money(body.rate),
        amount,
        body.remarks || null,
        now,
        now,
      ],
    )
    return (await query('SELECT * FROM Arrival WHERE id = ?', [id]))[0]
  },

  async updateArrival(id, body) {
    await ensureDb()
    const amount = money(Number(body.quantity) * Number(body.rate))
    await run(
      `UPDATE Arrival SET arrivalNumber = ?, arrivalDate = ?, partyName = ?, itemName = ?, quantity = ?, rate = ?, amount = ?, remarks = ?, updatedAt = ? WHERE id = ?`,
      [
        body.arrivalNumber,
        body.arrivalDate,
        body.partyName,
        body.itemName,
        money(body.quantity),
        money(body.rate),
        amount,
        body.remarks || null,
        nowIso(),
        id,
      ],
    )
    return (await query('SELECT * FROM Arrival WHERE id = ?', [id]))[0]
  },

  async deleteArrival(id) {
    await ensureDb()
    await run('DELETE FROM Arrival WHERE id = ?', [id])
    return null
  },

  async listTeep(params) {
    await ensureDb()
    let rows = await query(
      'SELECT * FROM TEEP WHERE financialYearId = ? ORDER BY saleDate DESC',
      [params.financialYearId],
    )
    if (params.search) {
      const s = params.search.toLowerCase()
      const filtered = []
      for (const row of rows) {
        const customers = await loadTeepCustomers(row.id)
        if (
          row.teepNumber.toLowerCase().includes(s) ||
          customers.some((c) => c.customerName.toLowerCase().includes(s))
        ) {
          filtered.push({ ...row, customers })
        }
      }
      rows = filtered
    } else {
      rows = await Promise.all(
        rows.map(async (row) => ({ ...row, customers: await loadTeepCustomers(row.id) })),
      )
    }
    return paginate(rows, params.page, params.pageSize)
  },

  async getTeep(id) {
    await ensureDb()
    const row = (await query('SELECT * FROM TEEP WHERE id = ?', [id]))[0]
    if (!row) throw new Error('TEEP not found')
    return { ...row, customers: await loadTeepCustomers(id) }
  },

  async getTeepSummary(id) {
    const teep = await this.getTeep(id)
    return getTeepDailySummary(teep.customers)
  },

  async getTeepCustomerBill(customerId) {
    await ensureDb()
    const customer = (await query('SELECT * FROM TEEPCustomer WHERE id = ?', [customerId]))[0]
    if (!customer) throw new Error('TEEP customer bill not found')
    return {
      ...customer,
      items: await query('SELECT * FROM TEEPItem WHERE customerId = ? ORDER BY sortOrder ASC', [
        customerId,
      ]),
      additionalCharges: await query(
        'SELECT * FROM TEEPAdditionalCharge WHERE customerId = ?',
        [customerId],
      ),
      payments: await query('SELECT * FROM TEEPPayment WHERE customerId = ?', [customerId]),
      teep: (await query('SELECT * FROM TEEP WHERE id = ?', [customer.teepId]))[0],
    }
  },

  async createTeep(body) {
    await ensureDb()
    if (!body.customers?.length) throw new Error('At least one customer is required')
    const fy = await getFinancialYear(body.financialYearId)
    const teepId = uid()
    const now = nowIso()
    const teepCount = (await query('SELECT COUNT(*) as count FROM TEEP WHERE financialYearId = ?', [
      body.financialYearId,
    ]))[0]?.count
    const teepNumber = `TEEP/${fy.name}/${String(Number(teepCount) + 1).padStart(4, '0')}`
    const saleDate = body.saleDate || now

    await run(
      `INSERT INTO TEEP (id, financialYearId, teepNumber, saleDate, remarks, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [teepId, body.financialYearId, teepNumber, saleDate, body.remarks || null, now, now],
    )

    let billCount = (
      await query('SELECT COUNT(*) as count FROM TEEPCustomer', [])
    )[0]?.count

    for (const customerInput of body.customers) {
      billCount += 1
      const customerId = uid()
      const totals = calcTeepCustomer(customerInput, saleDate)
      const billNumber = `BILL/${fy.name}/${String(billCount).padStart(4, '0')}`
      await run(
        `INSERT INTO TEEPCustomer (
          id, teepId, billNumber, customerName, discountType, discountValue, discountAmount,
          subtotal, netPayable, amountPaid, remainingBalance, paymentDuration, customDurationDays,
          paymentDueDate, paymentStatus, remarks, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          teepId,
          billNumber,
          customerInput.customerName?.trim() || 'Customer',
          customerInput.discountType || 'fixed',
          money(customerInput.discountValue),
          totals.discountAmount,
          totals.subtotal,
          totals.netPayable,
          totals.amountPaid,
          totals.remainingBalance,
          customerInput.paymentDuration || 'immediate',
          customerInput.customDurationDays || null,
          totals.paymentDueDate,
          totals.paymentStatus,
          customerInput.remarks || null,
          now,
          now,
        ],
      )

      for (const [index, item] of totals.items.entries()) {
        await run(
          `INSERT INTO TEEPItem (id, customerId, goodsName, quantity, unit, rate, amount, sortOrder)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uid(),
            customerId,
            item.goodsName,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
            index,
          ],
        )
      }

      for (const charge of totals.chargeRows) {
        await run(
          `INSERT INTO TEEPAdditionalCharge (id, customerId, name, chargeType, value, amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uid(), customerId, charge.name, charge.chargeType, charge.value, charge.amount],
        )
      }

      if (Number(totals.amountPaid) > 0) {
        await run(
          `INSERT INTO TEEPPayment (id, customerId, amount, paymentDate, remarks, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [uid(), customerId, totals.amountPaid, saleDate, 'Initial payment', now],
        )
      }
    }

    return this.getTeep(teepId)
  },

  async updateTeep(id, body) {
    await this.deleteTeep(id)
    return this.createTeep({ ...body, financialYearId: body.financialYearId })
  },

  async deleteTeep(id) {
    await ensureDb()
    const customers = await query('SELECT id FROM TEEPCustomer WHERE teepId = ?', [id])
    for (const customer of customers) {
      await run('DELETE FROM TEEPPayment WHERE customerId = ?', [customer.id])
      await run('DELETE FROM TEEPAdditionalCharge WHERE customerId = ?', [customer.id])
      await run('DELETE FROM TEEPItem WHERE customerId = ?', [customer.id])
      await run('DELETE FROM TEEPCustomer WHERE id = ?', [customer.id])
    }
    await run('DELETE FROM TEEP WHERE id = ?', [id])
    return null
  },
}
