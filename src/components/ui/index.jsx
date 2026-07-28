export function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export function ConfirmDialog({ state, onClose }) {
  if (!state) return null

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Confirm</h3>
        <p>{state.message}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onClose(true)}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function LoadingState({ message = 'Loading...' }) {
  return <div className="loading-state">{message}</div>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function DataTable({ columns, rows, emptyMessage = 'No records found.' }) {
  if (!rows.length) {
    return <div className="empty-state">{emptyMessage}</div>
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {totalPages} ({total} records)
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  )
}

export function FilterBar({ children }) {
  return <div className="filter-bar">{children}</div>
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

export function Field({ label, children, wide }) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Modal({ open, title, children, onClose, actions }) {
  if (!open) return null
  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-wide">
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  )
}
