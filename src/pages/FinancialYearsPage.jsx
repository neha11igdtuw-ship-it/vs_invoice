import { useState } from 'react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { Field, PageHeader } from '../components/ui'

export default function FinancialYearsPage() {
  const { financialYears, loadYears, notify } = useApp()
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
  })

  const handleCreate = async () => {
    try {
      if (!form.name || !form.startDate || !form.endDate) {
        throw new Error('Name, start date and end date are required')
      }
      await api.createFinancialYear(form)
      notify('Financial year created')
      setForm({ name: '', startDate: '', endDate: '', isActive: true })
      loadYears()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleActivate = async (id) => {
    try {
      await api.activateFinancialYear(id)
      notify('Financial year activated')
      loadYears()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Financial Years"
        subtitle="All records are stored separately by financial year"
      />

      <section className="panel-section">
        <h3>Create Financial Year</h3>
        <div className="field-grid">
          <Field label="Name (e.g. 2026-27)">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="2026-27"
            />
          </Field>
          <Field label="Start Date">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="End Date">
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </Field>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          <span>Set as active year</span>
        </label>
        <button type="button" className="btn btn-primary" onClick={handleCreate}>
          Create Year
        </button>
      </section>

      <section className="panel-section">
        <h3>Existing Years</h3>
        <div className="activity-list">
          {financialYears.map((year) => (
            <div key={year.id} className="activity-item">
              <div>
                <strong>{year.name}</strong>
                <span>
                  {new Date(year.startDate).toLocaleDateString('en-IN')} -{' '}
                  {new Date(year.endDate).toLocaleDateString('en-IN')}
                </span>
              </div>
              <div className="row-actions">
                {year.isActive ? (
                  <span className="badge">Active</span>
                ) : (
                  <button type="button" onClick={() => handleActivate(year.id)}>
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
