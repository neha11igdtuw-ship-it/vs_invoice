import { forwardRef } from 'react'
import { FIRM, EXPENSE_LABELS, FOOTER_TERMS } from '../utils/constants'
import { formatCurrency, formatRate, getExpenseDisplayName } from '../utils/calculations'
import { resolveNagSummaryText } from '../utils/nagSummary'

const InvoicePreview = forwardRef(function InvoicePreview({ invoice, totals }, ref) {
  const standardExpenseRows = EXPENSE_LABELS.map((label) => ({
    name: getExpenseDisplayName(label),
    amount: totals.allExpenses.find((expense) => expense.name === label)?.amount ?? 0,
  }))

  const extraExpenseRows = totals.allExpenses.filter(
    (expense) => !EXPENSE_LABELS.includes(expense.name),
  )

  const expenseRows = [...standardExpenseRows, ...extraExpenseRows]
  const nagSummaryText = resolveNagSummaryText(invoice, totals.autoCalc.totalNags)
  const rowCount = Math.max(totals.lineItems.length + (nagSummaryText ? 1 : 0), expenseRows.length, 9)

  const paddedRows = Array.from({ length: rowCount }, (_, index) => {
    const item = totals.lineItems[index] || null
    const isNagRow = !item && nagSummaryText && index === totals.lineItems.length

    return {
      description: item?.description || (isNagRow ? nagSummaryText : ''),
      quantity: item?.quantity || '',
      rate: item ? formatRate(item.rate) : '',
      gross: item?.gross || 0,
      expense: expenseRows[index] || null,
    }
  })

  const splitAmount = (amount) => {
    const formatted = formatCurrency(amount)
    const [rupees, paise] = formatted.split('-')
    return { rupees, paise }
  }

  const grossTotal = splitAmount(totals.grossTotal)
  const totalExpenses = splitAmount(totals.totalExpenses)
  const netBalance = splitAmount(totals.netBalance)

  return (
    <article className="invoice-sheet" ref={ref}>
      <header className="invoice-header">
        <div className="brand-block">
          <div className="logo-mark">
            <div className="logo-circle">
              <span>AKC</span>
              <span>VS</span>
            </div>
          </div>
          <div className="brand-meta">
            <p className="license">{FIRM.license}</p>
            {FIRM.contacts.map((contact) => (
              <p key={contact.phone}>
                {contact.name} : {contact.phone}
              </p>
            ))}
            <p>{FIRM.shopAddress}</p>
          </div>
        </div>

        <div className="title-block">
          <h1>{FIRM.name}</h1>
          <p className="tagline">{FIRM.tagline}</p>
          <p className="address">{FIRM.address}</p>
        </div>

        <div className="date-block">
          <span>Dated</span>
          <strong>{invoice.date || '—'}</strong>
        </div>
      </header>

      <section className="invoice-meta">
        <div className="meta-row">
          <div className="meta-field gr-field">
            <span className="meta-label">No.</span>
            <strong>{invoice.grNumber || '—'}</strong>
          </div>
          <div className="meta-field wide">
            <span className="meta-label">M/s</span>
            <strong>{invoice.customerName || '—'}</strong>
          </div>
        </div>
        <div className="meta-row secondary">
          <div className="meta-field">
            <span className="meta-label">Truck No.</span>
            <strong>{invoice.truckNumber || '—'}</strong>
          </div>
          <div className="meta-field">
            <span className="meta-label">Challan No.</span>
            <strong>{invoice.challanNumber || '—'}</strong>
          </div>
          <div className="meta-field">
            <span className="meta-label">Nag</span>
            <strong>{invoice.nag || '—'}</strong>
          </div>
        </div>
      </section>

      <div className="table-wrap">
        <div className="watermark">VS</div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="col-desc">DESCRIPTION</th>
              <th className="col-qty">Qty.</th>
              <th className="col-rate">Rate</th>
              <th className="col-gross" colSpan="2">
                Gross Sale
              </th>
              <th className="col-exp-name">Expenses</th>
              <th className="col-exp-amt" colSpan="2">
                Amount
              </th>
            </tr>
            <tr className="subhead">
              <th colSpan="3" />
              <th>Rs.</th>
              <th>P.</th>
              <th />
              <th>Rs.</th>
              <th>P.</th>
            </tr>
          </thead>
          <tbody>
            {paddedRows.map((row, index) => {
              const gross = splitAmount(row.gross)
              const expense = splitAmount(row.expense?.amount || 0)

              return (
                <tr key={index}>
                  <td>{row.description}</td>
                  <td className="center">{row.quantity}</td>
                  <td className="center">{row.rate}</td>
                  <td className="right">{row.gross ? gross.rupees : ''}</td>
                  <td className="center">{row.gross ? gross.paise : ''}</td>
                  <td>{row.expense?.name || ''}</td>
                  <td className="right">{row.expense?.amount ? expense.rupees : ''}</td>
                  <td className="center">{row.expense?.amount ? expense.paise : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan="3" className="total-label">
                G. TOTAL
              </td>
              <td className="right">{grossTotal.rupees}</td>
              <td className="center">{grossTotal.paise}</td>
              <td colSpan="3" />
            </tr>
            <tr className="totals-row">
              <td colSpan="3" className="total-label">
                Less Exp.
              </td>
              <td className="right">{totalExpenses.rupees}</td>
              <td className="center">{totalExpenses.paise}</td>
              <td colSpan="3" />
            </tr>
            <tr className="net-row">
              <td colSpan="3" className="total-label">
                Net. Bal.
              </td>
              <td className="right net-value">{netBalance.rupees}</td>
              <td className="center net-value">{netBalance.paise}</td>
              <td className="total-label">TOTAL EXP.</td>
              <td className="right">{totalExpenses.rupees}</td>
              <td className="center">{totalExpenses.paise}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer className="invoice-footer">
        <div className="terms">
          {FOOTER_TERMS.map((term) => (
            <p key={term}>{term}</p>
          ))}
        </div>
        <div className="signature-block">
          <p>E. &amp; O. E.</p>
          <div className="signature-line" />
          <p className="signatory">For {FIRM.name}</p>
        </div>
      </footer>
    </article>
  )
})

export default InvoicePreview
