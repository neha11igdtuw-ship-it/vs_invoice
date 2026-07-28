import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { uid } from './money.js'

const DB_NAME = 'vs_invoice'
let db = null
let sqlite = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS FinancialYear (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Invoice (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  serialNumber INTEGER NOT NULL,
  invoiceNumber TEXT NOT NULL,
  invoiceDate TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerPhone TEXT,
  customerAddress TEXT,
  truckNumber TEXT,
  challanNumber TEXT,
  nag TEXT,
  nagSummary TEXT,
  discount TEXT NOT NULL DEFAULT '0.00',
  tax TEXT NOT NULL DEFAULT '0.00',
  additionalCharges TEXT NOT NULL DEFAULT '0.00',
  grossTotal TEXT NOT NULL DEFAULT '0.00',
  totalExpenses TEXT NOT NULL DEFAULT '0.00',
  grandTotal TEXT NOT NULL DEFAULT '0.00',
  status TEXT NOT NULL DEFAULT 'active',
  expensesJson TEXT,
  labourAuto INTEGER NOT NULL DEFAULT 0,
  labourPerNag TEXT,
  forwardingAuto INTEGER NOT NULL DEFAULT 0,
  forwardingPercent TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(financialYearId, serialNumber)
);

CREATE TABLE IF NOT EXISTS InvoiceItem (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity TEXT NOT NULL,
  rate TEXT NOT NULL,
  amount TEXT NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS RedBookEntry (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  entryDate TEXT NOT NULL,
  recordNumber TEXT NOT NULL,
  partyName TEXT NOT NULL,
  description TEXT,
  quantity TEXT NOT NULL DEFAULT '0.00',
  rate TEXT NOT NULL DEFAULT '0.00',
  amount TEXT NOT NULL DEFAULT '0.00',
  remarks TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS LedgerEntry (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  partyName TEXT NOT NULL,
  entryDate TEXT NOT NULL,
  description TEXT,
  debit TEXT NOT NULL DEFAULT '0.00',
  credit TEXT NOT NULL DEFAULT '0.00',
  runningBalance TEXT NOT NULL DEFAULT '0.00',
  paymentStatus TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS DayBookEntry (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  entryDate TEXT NOT NULL,
  voucherNumber TEXT NOT NULL,
  transactionType TEXT NOT NULL,
  partyName TEXT NOT NULL,
  description TEXT,
  debit TEXT NOT NULL DEFAULT '0.00',
  credit TEXT NOT NULL DEFAULT '0.00',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Arrival (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  arrivalNumber TEXT NOT NULL,
  arrivalDate TEXT NOT NULL,
  partyName TEXT NOT NULL,
  itemName TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '0.00',
  rate TEXT NOT NULL DEFAULT '0.00',
  amount TEXT NOT NULL DEFAULT '0.00',
  remarks TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS TEEP (
  id TEXT PRIMARY KEY,
  financialYearId TEXT NOT NULL,
  teepNumber TEXT NOT NULL,
  saleDate TEXT NOT NULL,
  remarks TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS TEEPCustomer (
  id TEXT PRIMARY KEY,
  teepId TEXT NOT NULL,
  billNumber TEXT NOT NULL,
  customerName TEXT NOT NULL,
  discountType TEXT NOT NULL DEFAULT 'fixed',
  discountValue TEXT NOT NULL DEFAULT '0.00',
  discountAmount TEXT NOT NULL DEFAULT '0.00',
  subtotal TEXT NOT NULL DEFAULT '0.00',
  netPayable TEXT NOT NULL DEFAULT '0.00',
  amountPaid TEXT NOT NULL DEFAULT '0.00',
  remainingBalance TEXT NOT NULL DEFAULT '0.00',
  paymentDuration TEXT NOT NULL DEFAULT 'immediate',
  customDurationDays INTEGER,
  paymentDueDate TEXT NOT NULL,
  paymentStatus TEXT NOT NULL DEFAULT 'unpaid',
  remarks TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS TEEPItem (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  goodsName TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '0.00',
  unit TEXT NOT NULL DEFAULT 'Nag',
  rate TEXT NOT NULL DEFAULT '0.00',
  amount TEXT NOT NULL DEFAULT '0.00',
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS TEEPAdditionalCharge (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  name TEXT NOT NULL,
  chargeType TEXT NOT NULL DEFAULT 'fixed',
  value TEXT NOT NULL DEFAULT '0.00',
  amount TEXT NOT NULL DEFAULT '0.00'
);

CREATE TABLE IF NOT EXISTS TEEPPayment (
  id TEXT PRIMARY KEY,
  customerId TEXT NOT NULL,
  amount TEXT NOT NULL DEFAULT '0.00',
  paymentDate TEXT NOT NULL,
  remarks TEXT,
  createdAt TEXT NOT NULL
);
`

export async function initLocalDb() {
  if (db) return db

  sqlite = new SQLiteConnection(CapacitorSQLite)
  const conn = await sqlite.isConnection(DB_NAME, false)
  if (conn.result) {
    db = await sqlite.retrieveConnection(DB_NAME, false)
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
  }

  const isOpen = await db.isDBOpen()
  if (!isOpen.result) {
    await db.open()
  }

  await db.execute(SCHEMA)

  const years = await query('SELECT COUNT(*) as count FROM FinancialYear')
  if (!years[0]?.count) {
    const now = new Date().toISOString()
    await run(
      `INSERT INTO FinancialYear (id, name, startDate, endDate, isActive, createdAt)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [uid(), '2026-27', '2026-04-01T00:00:00.000Z', '2027-03-31T00:00:00.000Z', now],
    )
  }

  return db
}

export async function query(statement, values = []) {
  const result = await db.query(statement, values)
  return result.values || []
}

export async function run(statement, values = []) {
  return db.run(statement, values)
}

export function boolToInt(value) {
  return value ? 1 : 0
}

export function intToBool(value) {
  return Boolean(value)
}

export function nowIso() {
  return new Date().toISOString()
}
