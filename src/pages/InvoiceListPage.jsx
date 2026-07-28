import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import {
  DataTable,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
} from '../components/ui'
import { formatCurrency } from '../utils/calculations'

export default function InvoiceListPage() {
  const { activeYearId, notify, confirm } = useApp()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!activeYearId) return
    setLoading(true)
    try {
      const data = await api.listInvoices({
        financialYearId: activeYearId,
        search,
        status,
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
  }, [activeYearId, page, search, status])

  const handleCancel = async (id) => {
    const ok = await confirm('Cancel this invoice?')
    if (!ok) return
    try {
      await api.cancelInvoice(id)
      notify('Invoice cancelled')
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('Delete this invoice permanently?')
    if (!ok) return
    try {
      await api.deleteInvoice(id)
      notify('Invoice deleted')
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading && !rows.length) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Invoice"
        subtitle="Create, search, print, and manage invoices by financial year"
        actions={
          <Link className="btn btn-primary" to="/invoice/new">
            New Invoice
          </Link>
        }
      />

      <FilterBar>
        <input
          placeholder="Search customer, invoice no, truck..."
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FilterBar>

      <DataTable
        columns={[
          { key: 'invoiceNumber', label: 'Invoice No.' },
          { key: 'invoiceDate', label: 'Date', render: (row) => new Date(row.invoiceDate).toLocaleDateString('en-IN') },
          { key: 'customerName', label: 'Customer' },
          { key: 'grandTotal', label: 'Total', render: (row) => formatCurrency(row.grandTotal) },
          { key: 'status', label: 'Status' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="row-actions">
                <Link to={`/invoice/${row.id}`}>View</Link>
                <Link to={`/invoice/${row.id}/edit`}>Edit</Link>
                {row.status !== 'cancelled' && (
                  <button type="button" onClick={() => handleCancel(row.id)}>
                    Cancel
                  </button>
                )}
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
    </div>
  )
}
