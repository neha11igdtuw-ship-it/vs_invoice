import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  DataTable,
  Field,
  FilterBar,
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
} from '../components/ui'
import { formatCurrency } from '../utils/calculations'

export default function SimpleModulePage({ config }) {
  const { activeYearId, notify, confirm } = useApp()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(config.initialForm)
  const [editingId, setEditingId] = useState(null)

  const load = async () => {
    if (!activeYearId) return
    setLoading(true)
    try {
      const data = await config.listApi({
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
    setEditingId(null)
    setForm(config.initialForm)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm(config.toForm(row))
    setModalOpen(true)
  }

  const handleSave = async () => {
    try {
      config.validate?.(form)
      const payload = config.toPayload(form, activeYearId)
      if (editingId) {
        await config.updateApi(editingId, payload)
        notify(`${config.title} updated`)
      } else {
        await config.createApi(payload)
        notify(`${config.title} created`)
      }
      setModalOpen(false)
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm(`Delete this ${config.title} record?`)
    if (!ok) return
    try {
      await config.deleteApi(id)
      notify('Record deleted')
      load()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  if (loading && !rows.length) return <LoadingState />

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            Add {config.title}
          </button>
        }
      />

      <FilterBar>
        <input
          placeholder={config.searchPlaceholder}
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
      </FilterBar>

      <DataTable columns={config.columns(formatCurrency, { openEdit, handleDelete })} rows={rows} />
      <Pagination page={page} pageSize={20} total={total} onChange={setPage} />

      <Modal
        open={modalOpen}
        title={editingId ? `Edit ${config.title}` : `Add ${config.title}`}
        onClose={() => setModalOpen(false)}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
          </>
        }
      >
        <div className="field-grid">
          {config.fields.map((field) => (
            <Field label={field.label} key={field.name} wide={field.wide}>
              <input
                type={field.type || 'text'}
                value={form[field.name]}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  )
}
