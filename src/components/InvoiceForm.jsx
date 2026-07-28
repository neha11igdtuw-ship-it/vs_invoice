import {
  createEmptyLineItem,
  createInitialInvoice,
  createSampleInvoice,
  EXPENSE_LABELS,
  FORWARDING_DISPLAY_NAME,
  FORWARDING_EXPENSE_KEY,
  FORWARDING_PERCENT_PRESETS,
} from '../utils/constants'
import { formatNagSummary } from '../utils/nagSummary'

function Field({ label, children, wide }) {
  return (
    <label className={`field ${wide ? 'field-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function InvoiceForm({ invoice, setInvoice, totals, onClearDraft }) {
  const update = (key, value) => {
    setInvoice((prev) => ({ ...prev, [key]: value }))
  }

  const updateLineItem = (id, key, value) => {
    setInvoice((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const addLineItem = () => {
    setInvoice((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createEmptyLineItem()],
    }))
  }

  const removeLineItem = (id) => {
    setInvoice((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length > 1
          ? prev.lineItems.filter((item) => item.id !== id)
          : prev.lineItems,
    }))
  }

  const updateExpense = (label, value) => {
    setInvoice((prev) => ({
      ...prev,
      expenses: { ...prev.expenses, [label]: value },
    }))
  }

  const updateExtraExpense = (id, key, value) => {
    setInvoice((prev) => ({
      ...prev,
      extraExpenses: prev.extraExpenses.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }))
  }

  const addExtraExpense = () => {
    setInvoice((prev) => ({
      ...prev,
      extraExpenses: [
        ...prev.extraExpenses,
        { id: crypto.randomUUID(), name: '', amount: '' },
      ],
    }))
  }

  const removeExtraExpense = (id) => {
    setInvoice((prev) => ({
      ...prev,
      extraExpenses: prev.extraExpenses.filter((item) => item.id !== id),
    }))
  }

  const resetForm = () => {
    if (window.confirm('Clear all fields and start a new invoice?')) {
      setInvoice(createInitialInvoice())
      onClearDraft?.()
    }
  }

  return (
    <div className="form-panel no-print">
      <section className="form-section">
        <div className="section-head">
          <h2>Invoice Details</h2>
          <div className="section-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setInvoice(createSampleInvoice())}
            >
              Load Sample
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              New Invoice
            </button>
          </div>
        </div>
        <div className="field-grid">
          <Field label="GR / Invoice No.">
            <input
              value={invoice.grNumber}
              onChange={(e) => update('grNumber', e.target.value)}
              placeholder="e.g. 182"
            />
          </Field>
          <Field label="Date">
            <input
              value={invoice.date}
              onChange={(e) => update('date', e.target.value)}
              placeholder="DD/MM/YY"
            />
          </Field>
          <Field label="M/s (Customer Name)" wide>
            <input
              value={invoice.customerName}
              onChange={(e) => update('customerName', e.target.value)}
              placeholder="Sunil Bagh Baglu Prop. Sunil Rohta"
            />
          </Field>
          <Field label="Truck No.">
            <input
              value={invoice.truckNumber}
              onChange={(e) => update('truckNumber', e.target.value)}
              placeholder="HP 67/8676"
            />
          </Field>
          <Field label="Challan No.">
            <input
              value={invoice.challanNumber}
              onChange={(e) => update('challanNumber', e.target.value)}
              placeholder="002"
            />
          </Field>
          <Field label="Nag">
            <input
              value={invoice.nag}
              onChange={(e) => update('nag', e.target.value)}
              placeholder="30 CB="
            />
          </Field>
          <Field label="Total Nags (for labour calc)">
            <input
              type="number"
              min="0"
              value={invoice.totalNags}
              onChange={(e) => update('totalNags', e.target.value)}
              placeholder={`Auto: ${totals.autoCalc.totalNags || 0}`}
            />
          </Field>
          <Field label="Nag Summary (bottom of table)">
            <input
              value={invoice.nagSummary}
              onChange={(e) => update('nagSummary', e.target.value)}
              placeholder={
                totals.autoCalc.totalNags > 0
                  ? formatNagSummary(totals.autoCalc.totalNags)
                  : 'Total NUG is equal to 249 NUG'
              }
            />
          </Field>
        </div>
      </section>

      <section className="form-section auto-calc-section">
        <div className="section-head">
          <h2>Auto Calculate</h2>
        </div>

        <div className="auto-calc-card">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={invoice.labourAuto}
              onChange={(e) => update('labourAuto', e.target.checked)}
            />
            <span>Auto-calculate Labour &amp; SST from rate per nag</span>
          </label>

          <div className="field-grid">
            <Field label="Labour rate per nag (Rs.)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={invoice.labourPerNag}
                onChange={(e) => update('labourPerNag', e.target.value)}
                placeholder="e.g. 8 for cherry, 6 for mango"
                disabled={!invoice.labourAuto}
              />
            </Field>
            <Field label="Total nags used">
              <div className="computed-value inline">
                {totals.autoCalc.totalNags || 0} nag
                {totals.autoCalc.totalNags > 0 && invoice.labourPerNag
                  ? ` × ${invoice.labourPerNag} = ${formatCurrency(totals.autoCalc.labourAmount || 0)}`
                  : ''}
              </div>
            </Field>
          </div>
          <p className="hint">
            Customer tells you the labour rate (e.g. 8 Rs. per nag). App multiplies it by total nags.
            Leave total nags blank to read from Nag field or line item quantities.
          </p>
        </div>

        <div className="auto-calc-card">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={invoice.forwardingAuto}
              onChange={(e) => update('forwardingAuto', e.target.checked)}
            />
            <span>Auto-calculate SIT / Forwarding from gross total %</span>
          </label>

          <div className="field-grid">
            <Field label="SIT / Forwarding % of gross total">
              <input
                type="number"
                min="0"
                step="0.1"
                value={invoice.forwardingPercent}
                onChange={(e) => update('forwardingPercent', e.target.value)}
                placeholder="e.g. 6 or 8"
                disabled={!invoice.forwardingAuto}
              />
            </Field>
            <Field label="Calculated SIT / Forwarding">
              <div className="computed-value inline">
                {invoice.forwardingAuto && totals.autoCalc.forwardingPercent > 0
                  ? `${totals.autoCalc.forwardingPercent}% of ${formatCurrency(totals.grossTotal)} = ${formatCurrency(totals.autoCalc.forwardingAmount || 0)}`
                  : '—'}
              </div>
            </Field>
          </div>

          <div className="percent-picks">
            <span>Quick pick:</span>
            {FORWARDING_PERCENT_PRESETS.map((percent) => (
              <button
                key={percent}
                type="button"
                className={`percent-chip ${invoice.forwardingPercent === String(percent) ? 'active' : ''}`}
                disabled={!invoice.forwardingAuto}
                onClick={() => {
                  update('forwardingPercent', String(percent))
                  update('forwardingAuto', true)
                }}
              >
                {percent}%
              </button>
            ))}
          </div>
          <p className="hint">
            Supplier commission as SIT / Forwarding — commonly 6% or 8% of gross total.
          </p>
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h2>Line Items</h2>
          <button type="button" className="btn btn-ghost" onClick={addLineItem}>
            + Add Row
          </button>
        </div>
        <div className="line-items">
          <div className="line-items-header">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Gross</span>
            <span />
          </div>
          {invoice.lineItems.map((item) => {
            const gross =
              totals.lineItems.find((row) => row.id === item.id)?.gross ?? 0
            return (
              <div className="line-item-row" key={item.id}>
                <input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  placeholder="A/10 Pannet Black cherry"
                />
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                  placeholder="10"
                />
                <input
                  type="number"
                  min="0"
                  value={item.rate}
                  onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                  placeholder="650"
                />
                <div className="computed-value">{formatCurrency(gross)}</div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => removeLineItem(item.id)}
                  aria-label="Remove row"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className="form-section">
        <div className="section-head">
          <h2>Expenses</h2>
        </div>
        <div className="expense-grid">
          {EXPENSE_LABELS.map((label) => {
            const isLabourAuto = label === 'Labour & SST' && invoice.labourAuto
            const isForwardingAuto = label === FORWARDING_EXPENSE_KEY && invoice.forwardingAuto
            const autoValue =
              label === 'Labour & SST'
                ? totals.autoCalc.labourAmount
                : label === FORWARDING_EXPENSE_KEY
                  ? totals.autoCalc.forwardingAmount
                  : null

            return (
              <Field
                label={label === FORWARDING_EXPENSE_KEY ? FORWARDING_DISPLAY_NAME : label}
                key={label}
              >
                <input
                  type="number"
                  min="0"
                  value={
                    isLabourAuto || isForwardingAuto
                      ? autoValue ?? ''
                      : invoice.expenses[label]
                  }
                  onChange={(e) => updateExpense(label, e.target.value)}
                  placeholder="0"
                  disabled={isLabourAuto || isForwardingAuto}
                  className={isLabourAuto || isForwardingAuto ? 'auto-filled' : ''}
                />
              </Field>
            )
          })}
        </div>

        <div className="extra-expenses">
          <div className="section-head compact">
            <h3>Additional Expenses</h3>
            <button type="button" className="btn btn-ghost" onClick={addExtraExpense}>
              + Add
            </button>
          </div>
          {invoice.extraExpenses.map((item) => (
            <div className="extra-expense-row" key={item.id}>
              <input
                value={item.name}
                onChange={(e) => updateExtraExpense(item.id, 'name', e.target.value)}
                placeholder="e.g. SIT"
              />
              <input
                type="number"
                min="0"
                value={item.amount}
                onChange={(e) => updateExtraExpense(item.id, 'amount', e.target.value)}
                placeholder="180"
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => removeExtraExpense(item.id)}
                aria-label="Remove expense"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="summary-card">
        <div>
          <span>G. Total</span>
          <strong>{formatCurrency(totals.grossTotal)}</strong>
        </div>
        <div>
          <span>Less Expenses</span>
          <strong>{formatCurrency(totals.totalExpenses)}</strong>
        </div>
        <div>
          <span>Net Balance</span>
          <strong className="highlight">{formatCurrency(totals.netBalance)}</strong>
        </div>
        {invoice.labourAuto && totals.autoCalc.labourAmount !== null && (
          <div>
            <span>Labour ({totals.autoCalc.labourPerNag} × {totals.autoCalc.totalNags})</span>
            <strong>{formatCurrency(totals.autoCalc.labourAmount)}</strong>
          </div>
        )}
        {invoice.forwardingAuto && totals.autoCalc.forwardingAmount !== null && (
          <div>
            <span>SIT / Forwarding ({totals.autoCalc.forwardingPercent}%)</span>
            <strong>{formatCurrency(totals.autoCalc.forwardingAmount)}</strong>
          </div>
        )}
      </section>
    </div>
  )
}
