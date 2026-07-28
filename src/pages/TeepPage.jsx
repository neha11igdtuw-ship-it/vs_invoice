import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import {
  DataTable,
  Field,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatCard,
} from '../components/ui'
import { formatCurrency } from '../utils/calculations'

const PAYMENT_DURATIONS = [
  { value: 'immediate', label: 'Immediate payment' },
  { value: 'same_day', label: 'Same day' },
  { value: '7_days', label: '7 days' },
  { value: '15_days', label: '15 days' },
  { value: '30_days', label: '30 days' },
  { value: '45_days', label: '45 days' },
  { value: 'custom', label: 'Custom duration' },
]

const CHARGE_PRESETS = ['Transport', 'Loading', 'Unloading', 'Packing', 'Labour', 'Delivery', 'Late-payment charge', 'Other charge']

function emptyCustomer() {
  return {
    id: crypto.randomUUID(),
    customerName: '',
    discountType: 'fixed',
    discountValue: '',
    paymentDuration: 'immediate',
    customDurationDays: '',
    amountPaid: '',
    remarks: '',
    items: [{ id: crypto.randomUUID(), goodsName: '', quantity: '', unit: 'Nag', rate: '' }],
    additionalCharges: [],
  }
}

export default function TeepPage() {
  const { activeYearId, notify, confirm } = useApp()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState({
    saleDate: new Date().toISOString().slice(0, 10),
    remarks: '',
    customers: [emptyCustomer()],
  })

  const load = async () => {
    if (!activeYearId) return
    setLoading(true)
    try {
      const data = await api.listTeep({
        financialYearId: activeYearId,
        search,
        page,
        pageSize: 20,
      })
      setRows(data.items)
      setTotal(data.total)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeYearId, page, search])

  const openCreate = () => {
    setSelected(null)
    setSummary(null)
    setForm({
      saleDate: new Date().toISOString().slice(0, 10),
      remarks: '',
      customers: [emptyCustomer()],
    })
    setModalOpen(true)
  }

  const openView = async (row) => {
    try {
      const teep = await api.getTeep(row.id)
      const teepSummary = await api.getTeepSummary(row.id)
      setSelected(teep)
      setSummary(teepSummary)
      setModalOpen(true)
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const updateCustomer = (customerId, key, value) => {
    setForm((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) =>
        customer.id === customerId ? { ...customer, [key]: value } : customer,
      ),
    }))
  }

  const addCustomer = () => {
    setForm((prev) => ({ ...prev, customers: [...prev.customers, emptyCustomer()] }))
  }

  const addItem = (customerId) => {
    setForm((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              items: [
                ...customer.items,
                { id: crypto.randomUUID(), goodsName: '', quantity: '', unit: 'Nag', rate: '' },
              ],
            }
          : customer,
      ),
    }))
  }

  const addCharge = (customerId, name = 'Transport') => {
    setForm((prev) => ({
      ...prev,
      customers: prev.customers.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              additionalCharges: [
                ...customer.additionalCharges,
                { id: crypto.randomUUID(), name, chargeType: 'fixed', value: '' },
              ],
            }
          : customer,
      ),
    }))
  }

  const handleSave = async () => {
    try {
      if (!form.customers.length) throw new Error('Add at least one customer')
      const payload = {
        financialYearId: activeYearId,
        saleDate: form.saleDate,
        remarks: form.remarks,
        customers: form.customers.map((customer) => ({
          customerName: customer.customerName,
          discountType: customer.discountType,
          discountValue: customer.discountValue,
          paymentDuration: customer.paymentDuration,
          customDurationDays: customer.customDurationDays,
          amountPaid: customer.amountPaid,
          remarks: customer.remarks,
          items: customer.items,
          additionalCharges: customer.additionalCharges,
        })),
      }
      await api.createTeep(payload)
      notify('TEEP saved')
      setModalOpen(false)
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this TEEP record?')
    if (!ok) return
    try {
      await api.deleteTeep(id)
      notify('TEEP deleted')
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading && !rows.length) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="TEEP"
        subtitle="Daily sales record book with customers, items, payment terms, and bills"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            New TEEP
          </button>
        }
      />

      <FilterBar>
        <input
          placeholder="Search TEEP number or customer..."
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
      </FilterBar>

      <DataTable
        columns={[
          { key: 'teepNumber', label: 'TEEP No.' },
          { key: 'saleDate', label: 'Date', render: (row) => new Date(row.saleDate).toLocaleDateString('en-IN') },
          { key: 'customers', label: 'Customers', render: (row) => row.customers.length },
          {
            key: 'net',
            label: 'Net Sales',
            render: (row) =>
              formatCurrency(row.customers.reduce((sum, customer) => sum + Number(customer.netPayable), 0)),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="row-actions">
                <button type="button" onClick={() => openView(row)}>
                  View
                </button>
                <button type="button" onClick={() => handleDelete(row.id)}>
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        rows={rows}
      />
      <Pagination page={page} pageSize={20} total={total} onChange={setPage} />

      <Modal
        open={modalOpen}
        title={selected ? `TEEP ${selected.teepNumber}` : 'New TEEP'}
        onClose={() => setModalOpen(false)}
        actions={
          selected ? null : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save TEEP
              </button>
            </>
          )
        }
      >
        {selected ? (
          <div>
            {summary && (
              <div className="stat-grid compact">
                <StatCard label="Customers" value={summary.totalCustomers} />
                <StatCard label="Gross Sales" value={formatCurrency(summary.grossSales)} />
                <StatCard label="Net Sales" value={formatCurrency(summary.netSales)} />
                <StatCard label="Received" value={formatCurrency(summary.amountReceived)} />
                <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} />
              </div>
            )}
            {selected.customers.map((customer) => (
              <div className="teep-bill-card" key={customer.id}>
                <h4>{customer.customerName}</h4>
                <p>Bill: {customer.billNumber}</p>
                <p>Due: {new Date(customer.paymentDueDate).toLocaleDateString('en-IN')}</p>
                <p>Status: {customer.paymentStatus}</p>
                <p>Net Payable: {formatCurrency(customer.netPayable)}</p>
                <p>Paid: {formatCurrency(customer.amountPaid)}</p>
                <p>Balance: {formatCurrency(customer.remainingBalance)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="teep-form">
            <div className="field-grid">
              <Field label="Sale Date">
                <input
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                />
              </Field>
              <Field label="Remarks" wide>
                <input
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </Field>
            </div>

            {form.customers.map((customer) => (
              <div className="teep-customer-card" key={customer.id}>
                <Field label="Customer Name" wide>
                  <input
                    value={customer.customerName}
                    onChange={(e) => updateCustomer(customer.id, 'customerName', e.target.value)}
                  />
                </Field>
                <div className="field-grid">
                  <Field label="Discount Type">
                    <select
                      value={customer.discountType}
                      onChange={(e) => updateCustomer(customer.id, 'discountType', e.target.value)}
                    >
                      <option value="fixed">Fixed amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </Field>
                  <Field label="Discount Value">
                    <input
                      type="number"
                      value={customer.discountValue}
                      onChange={(e) => updateCustomer(customer.id, 'discountValue', e.target.value)}
                    />
                  </Field>
                  <Field label="Payment Duration">
                    <select
                      value={customer.paymentDuration}
                      onChange={(e) => updateCustomer(customer.id, 'paymentDuration', e.target.value)}
                    >
                      {PAYMENT_DURATIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {customer.paymentDuration === 'custom' && (
                    <Field label="Custom Days">
                      <input
                        type="number"
                        value={customer.customDurationDays}
                        onChange={(e) => updateCustomer(customer.id, 'customDurationDays', e.target.value)}
                      />
                    </Field>
                  )}
                  <Field label="Amount Paid">
                    <input
                      type="number"
                      value={customer.amountPaid}
                      onChange={(e) => updateCustomer(customer.id, 'amountPaid', e.target.value)}
                    />
                  </Field>
                </div>

                <div className="section-head compact">
                  <h4>Items</h4>
                  <button type="button" className="btn btn-ghost" onClick={() => addItem(customer.id)}>
                    + Item
                  </button>
                </div>
                {customer.items.map((item) => (
                  <div className="line-item-row" key={item.id}>
                    <input
                      placeholder="Goods name"
                      value={item.goodsName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  items: row.items.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, goodsName: e.target.value }
                                      : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                    <input
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  items: row.items.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, quantity: e.target.value }
                                      : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                    <input
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  items: row.items.map((entry) =>
                                    entry.id === item.id ? { ...entry, unit: e.target.value } : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                    <input
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  items: row.items.map((entry) =>
                                    entry.id === item.id ? { ...entry, rate: e.target.value } : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="section-head compact">
                  <h4>Additional Charges</h4>
                  <div className="section-actions">
                    {CHARGE_PRESETS.slice(0, 4).map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => addCharge(customer.id, name)}
                      >
                        + {name}
                      </button>
                    ))}
                  </div>
                </div>
                {customer.additionalCharges.map((charge) => (
                  <div className="extra-expense-row" key={charge.id}>
                    <input value={charge.name} readOnly />
                    <select
                      value={charge.chargeType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  additionalCharges: row.additionalCharges.map((entry) =>
                                    entry.id === charge.id
                                      ? { ...entry, chargeType: e.target.value }
                                      : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    >
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                    <input
                      type="number"
                      value={charge.value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          customers: prev.customers.map((row) =>
                            row.id === customer.id
                              ? {
                                  ...row,
                                  additionalCharges: row.additionalCharges.map((entry) =>
                                    entry.id === charge.id
                                      ? { ...entry, value: e.target.value }
                                      : entry,
                                  ),
                                }
                              : row,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            ))}

            <button type="button" className="btn btn-secondary" onClick={addCustomer}>
              + Add Customer
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
