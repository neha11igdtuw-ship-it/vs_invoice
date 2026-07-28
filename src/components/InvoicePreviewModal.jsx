import { useEffect, useRef, useState } from 'react'
import InvoicePreview from './InvoicePreview'

export default function InvoicePreviewModal({ open, onClose, invoice, totals }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!open) return undefined

    const fitPreview = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const sheet = wrap.querySelector('.invoice-sheet')
      if (!sheet) return

      const availableWidth = wrap.clientWidth - 24
      const naturalWidth = sheet.offsetWidth || 920
      const availableHeight = wrap.clientHeight - 24
      const naturalHeight = sheet.offsetHeight || 600

      const widthScale = availableWidth / naturalWidth
      const heightScale = availableHeight / naturalHeight
      setScale(Math.min(1, widthScale, heightScale))
    }

    fitPreview()
    const timer = window.setTimeout(fitPreview, 80)
    window.addEventListener('resize', fitPreview)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', fitPreview)
    }
  }, [open, invoice, totals])

  if (!open) return null

  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
        <header className="preview-modal-header">
          <div>
            <strong>Invoice Preview</strong>
            <p>Full view — pinch or screenshot to save</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">
            ✕
          </button>
        </header>

        <div className="preview-fit-viewport" ref={wrapRef}>
          <div
            className="preview-fit-scaler"
            style={{
              transform: `scale(${scale})`,
              width: scale < 1 ? `${100 / scale}%` : '100%',
            }}
          >
            <InvoicePreview invoice={invoice} totals={totals} />
          </div>
        </div>
      </div>
    </div>
  )
}
