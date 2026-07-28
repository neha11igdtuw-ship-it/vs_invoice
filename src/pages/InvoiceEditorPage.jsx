import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import InvoiceForm from '../components/InvoiceForm'
import { LoadingState, PageHeader } from '../components/ui'

import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { createInitialInvoice } from '../utils/constants'
import { calculateInvoiceTotals } from '../utils/calculations'
import { dbInvoiceToFormState, formStateToInvoicePayload } from '../utils/invoiceMapper'
import {
  clearInvoiceDraft,
  hasDraftContent,
  restoreInvoiceDraft,
  saveInvoiceDraft,
} from '../utils/invoiceDraft'
import { exportInvoice, prepareInvoiceForCapture } from '../utils/printInvoice'

export default function InvoiceEditorPage({ mode = 'create' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeYearId, notify } = useApp()
  const [invoice, setInvoice] = useState(createInitialInvoice)
  const [loading, setLoading] = useState(mode !== 'create')
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const isNative = Capacitor.isNativePlatform()
  const isCreateMode = mode === 'create'
  const draftLoadedRef = useRef(false)
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice])
  const readOnly = mode === 'view'

  useEffect(() => {
    if (!isCreateMode || !activeYearId || draftLoadedRef.current) return
    draftLoadedRef.current = true

    const draft = restoreInvoiceDraft(activeYearId)
    if (hasDraftContent(draft)) {
      setInvoice(draft)
      notify('Draft restored — your unsaved invoice is back')
    }
  }, [activeYearId, isCreateMode, notify])

  useEffect(() => {
    if (!isCreateMode || !activeYearId) return undefined

    const timer = window.setTimeout(() => {
      saveInvoiceDraft(activeYearId, invoice)
      setDraftSaved(hasDraftContent(invoice))
    }, 800)

    return () => window.clearTimeout(timer)
  }, [activeYearId, invoice, isCreateMode])

  const handleClearDraft = useCallback(() => {
    if (activeYearId) clearInvoiceDraft(activeYearId)
    setDraftSaved(false)
  }, [activeYearId])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api
      .getInvoice(id)
      .then((data) => setInvoice(dbInvoiceToFormState(data)))
      .catch((error) => notify(error.message, 'error'))
      .finally(() => setLoading(false))
  }, [id, notify])

  const handleSave = async () => {
    if (!activeYearId) {
      notify('Select a financial year first', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = formStateToInvoicePayload(invoice, activeYearId)
      if (mode === 'edit' && id) {
        await api.updateInvoice(id, payload)
        notify('Invoice updated')
      } else {
        const created = await api.createInvoice(payload)
        clearInvoiceDraft(activeYearId)
        setDraftSaved(false)
        notify(`Invoice saved as ${created.invoiceNumber}`)
        navigate(`/invoice/${created.id}`)
      }
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePdf = async () => {
    if (exportingPdf) return

    setShowPreview(true)
    await prepareInvoiceForCapture()

    setExportingPdf(true)
    try {
      const element = document.querySelector('.preview-modal .invoice-sheet')
      if (!element) {
        throw new Error('Invoice preview not ready')
      }

      const result = await exportInvoice({
        element,
        invoiceNumber: invoice.invoiceNumber || invoice.grNumber,
      })
      if (result?.mode === 'cancelled') return
      notify(
        isNative
          ? 'Choose Save to Files, Drive, or WhatsApp in the menu'
          : 'PDF downloaded',
      )
    } catch (error) {
      notify(error.message || 'PDF could not be created', 'error')
    } finally {
      setExportingPdf(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="invoice-editor-page">
      <PageHeader
        title={
          mode === 'create'
            ? 'New Invoice'
            : mode === 'edit'
              ? `Edit Invoice ${invoice.invoiceNumber || ''}`
              : `Invoice ${invoice.invoiceNumber || ''}`
        }
        subtitle={
          isCreateMode && draftSaved
            ? 'Draft saved automatically on this phone'
            : 'Commission invoice with labour, SIT / Forwarding, and expenses'
        }
        actions={
          <>
            <Link className="btn btn-secondary" to="/invoice">
              Back to list
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(true)}>
              Show Preview
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={exportingPdf}
              onClick={handlePdf}
            >
              {exportingPdf ? 'Creating PDF...' : 'Save PDF'}
            </button>
            {!readOnly && (
              <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save Invoice'}
              </button>
            )}
          </>
        }
      />

      <div className={`layout ${readOnly ? 'layout-readonly' : ''}`}>
        {!readOnly && (
          <InvoiceForm
            invoice={invoice}
            setInvoice={setInvoice}
            totals={totals}
            onClearDraft={handleClearDraft}
          />
        )}
        {readOnly && (
          <section className="panel-section">
            <p>Open full preview to view, screenshot, or save PDF.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowPreview(true)}>
              Open Full Preview
            </button>
          </section>
        )}
      </div>

      {(showPreview || exportingPdf) && (
        <Suspense fallback={null}>
          <InvoicePreviewModal
            open={showPreview || exportingPdf}
            onClose={() => setShowPreview(false)}
            invoice={invoice}
            totals={totals}
          />
        </Suspense>
      )}

      {exportingPdf && (
        <div className="pdf-export-overlay">
          <div className="pdf-export-card">
            <strong>Creating PDF...</strong>
            <p>Please wait. Do not leave this page.</p>
          </div>
        </div>
      )}
    </div>
  )
}
