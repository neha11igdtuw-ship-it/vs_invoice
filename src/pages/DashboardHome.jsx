import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { LoadingState, PageHeader, StatCard } from '../components/ui'
import { formatCurrency } from '../utils/calculations'

const MODULES = [
  { to: '/invoice', label: 'Invoice', hint: 'Create & print bills' },
  { to: '/red-book', label: 'Red Book', hint: 'Daily mandi records' },
  { to: '/ledger', label: 'Ledger', hint: 'Party khata' },
  { to: '/day-book', label: 'Day Book', hint: 'Cash vouchers' },
  { to: '/arrival', label: 'Arrival', hint: 'Fruit arrivals' },
  { to: '/teep', label: 'TEEP', hint: 'Customer sales' },
]

export default function DashboardHome() {
  const { activeYearId, notify } = useApp()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeYearId) return
    setLoading(true)
    api
      .getDashboardSummary(activeYearId)
      .then(setSummary)
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [activeYearId, notify])

  const cards = useMemo(() => {
    if (!summary) return []
    return [
      { label: 'Total Invoices', value: summary.totalInvoices },
      { label: 'Invoice Amount', value: formatCurrency(summary.totalInvoiceAmount) },
      { label: 'Ledger Debit', value: formatCurrency(summary.ledgerDebit) },
      { label: 'Ledger Credit', value: formatCurrency(summary.ledgerCredit) },
      { label: 'Day Book Entries', value: summary.dayBookEntries },
      { label: 'Arrival Entries', value: summary.arrivalEntries },
      { label: 'TEEP Sales', value: formatCurrency(summary.teepSales) },
      { label: 'Total Received', value: formatCurrency(summary.totalReceived) },
      { label: 'Outstanding', value: formatCurrency(summary.totalOutstanding) },
      { label: 'Overdue Payments', value: summary.overduePayments },
    ]
  }, [summary])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Tap a module to open it"
        actions={
          <Link className="btn btn-primary" to="/invoice/new">
            New Invoice
          </Link>
        }
      />

      <section className="module-grid">
        {MODULES.map((module) => (
          <Link key={module.to} to={module.to} className="module-card">
            <strong>{module.label}</strong>
            <span>{module.hint}</span>
          </Link>
        ))}
      </section>

      <div className="stat-grid">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <section className="panel-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {(summary?.recentActivity || []).map((item) => (
            <div key={`${item.type}-${item.id}`} className="activity-item">
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
              <div className="activity-meta">
                <span>{formatCurrency(item.amount)}</span>
                <small>{new Date(item.createdAt).toLocaleString('en-IN')}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
