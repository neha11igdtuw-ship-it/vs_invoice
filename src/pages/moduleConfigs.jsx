import { api } from '../api/client'

const actionColumn = (handlers) => ({
  key: 'actions',
  label: 'Actions',
  render: (row) => (
    <div className="row-actions">
      <button type="button" onClick={() => handlers.openEdit(row)}>
        Edit
      </button>
      <button type="button" onClick={() => handlers.handleDelete(row.id)}>
        Delete
      </button>
    </div>
  ),
})

export const redBookConfig = {
  title: 'Red Book',
  subtitle: 'Red book records by financial year',
  searchPlaceholder: 'Search party, record no, description...',
  initialForm: {
    entryDate: new Date().toISOString().slice(0, 10),
    recordNumber: '',
    partyName: '',
    description: '',
    quantity: '',
    rate: '',
    remarks: '',
  },
  listApi: api.listRedBook,
  createApi: api.createRedBook,
  updateApi: api.updateRedBook,
  deleteApi: api.deleteRedBook,
  validate: (form) => {
    if (!form.partyName.trim()) throw new Error('Party name is required')
    if (!form.recordNumber.trim()) throw new Error('Record number is required')
  },
  toForm: (row) => ({
    entryDate: row.entryDate.slice(0, 10),
    recordNumber: row.recordNumber,
    partyName: row.partyName,
    description: row.description || '',
    quantity: String(row.quantity),
    rate: String(row.rate),
    remarks: row.remarks || '',
  }),
  toPayload: (form, financialYearId) => ({ ...form, financialYearId }),
  fields: [
    { name: 'entryDate', label: 'Date', type: 'date' },
    { name: 'recordNumber', label: 'Record Number' },
    { name: 'partyName', label: 'Party / Customer', wide: true },
    { name: 'description', label: 'Description', wide: true },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'rate', label: 'Rate', type: 'number' },
    { name: 'remarks', label: 'Remarks', wide: true },
  ],
  columns: (formatCurrency, handlers) => [
    { key: 'entryDate', label: 'Date', render: (row) => new Date(row.entryDate).toLocaleDateString('en-IN') },
    { key: 'recordNumber', label: 'Record No.' },
    { key: 'partyName', label: 'Party' },
    { key: 'description', label: 'Description' },
    { key: 'quantity', label: 'Qty' },
    { key: 'rate', label: 'Rate' },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    actionColumn(handlers),
  ],
}

export const ledgerConfig = {
  title: 'Ledger',
  subtitle: 'Party ledger with running balance',
  searchPlaceholder: 'Search party name...',
  initialForm: {
    entryDate: new Date().toISOString().slice(0, 10),
    partyName: '',
    description: '',
    debit: '',
    credit: '',
    paymentStatus: 'pending',
  },
  listApi: api.listLedger,
  createApi: api.createLedger,
  updateApi: api.updateLedger,
  deleteApi: api.deleteLedger,
  validate: (form) => {
    if (!form.partyName.trim()) throw new Error('Party name is required')
  },
  toForm: (row) => ({
    entryDate: row.entryDate.slice(0, 10),
    partyName: row.partyName,
    description: row.description || '',
    debit: String(row.debit),
    credit: String(row.credit),
    paymentStatus: row.paymentStatus,
  }),
  toPayload: (form, financialYearId) => ({ ...form, financialYearId }),
  fields: [
    { name: 'entryDate', label: 'Date', type: 'date' },
    { name: 'partyName', label: 'Party / Account', wide: true },
    { name: 'description', label: 'Description', wide: true },
    { name: 'debit', label: 'Debit', type: 'number' },
    { name: 'credit', label: 'Credit', type: 'number' },
    { name: 'paymentStatus', label: 'Payment Status' },
  ],
  columns: (formatCurrency, handlers) => [
    { key: 'entryDate', label: 'Date', render: (row) => new Date(row.entryDate).toLocaleDateString('en-IN') },
    { key: 'partyName', label: 'Party' },
    { key: 'description', label: 'Description' },
    { key: 'debit', label: 'Debit', render: (row) => formatCurrency(row.debit) },
    { key: 'credit', label: 'Credit', render: (row) => formatCurrency(row.credit) },
    { key: 'runningBalance', label: 'Balance', render: (row) => formatCurrency(row.runningBalance) },
    { key: 'paymentStatus', label: 'Status' },
    actionColumn(handlers),
  ],
}

export const dayBookConfig = {
  title: 'Day Book',
  subtitle: 'Daily voucher transactions',
  searchPlaceholder: 'Search voucher, party, description...',
  initialForm: {
    entryDate: new Date().toISOString().slice(0, 10),
    voucherNumber: '',
    transactionType: '',
    partyName: '',
    description: '',
    debit: '',
    credit: '',
  },
  listApi: api.listDayBook,
  createApi: api.createDayBook,
  updateApi: api.updateDayBook,
  deleteApi: api.deleteDayBook,
  validate: (form) => {
    if (!form.voucherNumber.trim()) throw new Error('Voucher number is required')
    if (!form.partyName.trim()) throw new Error('Party name is required')
  },
  toForm: (row) => ({
    entryDate: row.entryDate.slice(0, 10),
    voucherNumber: row.voucherNumber,
    transactionType: row.transactionType,
    partyName: row.partyName,
    description: row.description || '',
    debit: String(row.debit),
    credit: String(row.credit),
  }),
  toPayload: (form, financialYearId) => ({ ...form, financialYearId }),
  fields: [
    { name: 'entryDate', label: 'Date', type: 'date' },
    { name: 'voucherNumber', label: 'Voucher Number' },
    { name: 'transactionType', label: 'Transaction Type' },
    { name: 'partyName', label: 'Party / Account', wide: true },
    { name: 'description', label: 'Description', wide: true },
    { name: 'debit', label: 'Debit', type: 'number' },
    { name: 'credit', label: 'Credit', type: 'number' },
  ],
  columns: (formatCurrency, handlers) => [
    { key: 'entryDate', label: 'Date', render: (row) => new Date(row.entryDate).toLocaleDateString('en-IN') },
    { key: 'voucherNumber', label: 'Voucher' },
    { key: 'transactionType', label: 'Type' },
    { key: 'partyName', label: 'Party' },
    { key: 'debit', label: 'Debit', render: (row) => formatCurrency(row.debit) },
    { key: 'credit', label: 'Credit', render: (row) => formatCurrency(row.credit) },
    actionColumn(handlers),
  ],
}

export const arrivalConfig = {
  title: 'Arrival',
  subtitle: 'Goods arrival records',
  searchPlaceholder: 'Search arrival no, party, item...',
  initialForm: {
    arrivalNumber: '',
    arrivalDate: new Date().toISOString().slice(0, 10),
    partyName: '',
    itemName: '',
    quantity: '',
    rate: '',
    remarks: '',
  },
  listApi: api.listArrivals,
  createApi: api.createArrival,
  updateApi: api.updateArrival,
  deleteApi: api.deleteArrival,
  validate: (form) => {
    if (!form.arrivalNumber.trim()) throw new Error('Arrival number is required')
    if (!form.partyName.trim()) throw new Error('Party name is required')
    if (!form.itemName.trim()) throw new Error('Item name is required')
  },
  toForm: (row) => ({
    arrivalNumber: row.arrivalNumber,
    arrivalDate: row.arrivalDate.slice(0, 10),
    partyName: row.partyName,
    itemName: row.itemName,
    quantity: String(row.quantity),
    rate: String(row.rate),
    remarks: row.remarks || '',
  }),
  toPayload: (form, financialYearId) => ({ ...form, financialYearId }),
  fields: [
    { name: 'arrivalNumber', label: 'Arrival Number' },
    { name: 'arrivalDate', label: 'Date', type: 'date' },
    { name: 'partyName', label: 'Party Name', wide: true },
    { name: 'itemName', label: 'Item / Goods', wide: true },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'rate', label: 'Rate', type: 'number' },
    { name: 'remarks', label: 'Remarks', wide: true },
  ],
  columns: (formatCurrency, handlers) => [
    { key: 'arrivalDate', label: 'Date', render: (row) => new Date(row.arrivalDate).toLocaleDateString('en-IN') },
    { key: 'arrivalNumber', label: 'Arrival No.' },
    { key: 'partyName', label: 'Party' },
    { key: 'itemName', label: 'Item' },
    { key: 'quantity', label: 'Qty' },
    { key: 'amount', label: 'Amount', render: (row) => formatCurrency(row.amount) },
    actionColumn(handlers),
  ],
}
