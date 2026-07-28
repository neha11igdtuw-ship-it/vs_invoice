import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'

const CAPTURE_WIDTH = 920

const BRAND = {
  red: '#c41e3a',
  blue: '#1e4b8f',
  green: '#2d6a4f',
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isNative() {
  return Capacitor.isNativePlatform()
}

function getCaptureScale() {
  return isNative() ? 1.5 : 2
}

export function sanitizePdfFileName(invoiceNumber = '') {
  const safe = String(invoiceNumber || Date.now())
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return `VS-Invoice-${safe || Date.now()}.pdf`
}

function applyBorderFixes(scope) {
  scope.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'separate'
    table.style.borderSpacing = '0'
    table.style.width = '100%'
  })

  scope.querySelectorAll('th, td').forEach((cell) => {
    cell.style.border = '1px solid #111111'
  })
}

function preservePreviewColors(scope) {
  scope.style.background = '#ffffff'
  scope.style.visibility = 'visible'
  scope.style.opacity = '1'

  scope.querySelectorAll('.title-block h1, .address, .signatory').forEach((el) => {
    el.style.color = BRAND.red
  })

  scope.querySelectorAll('.tagline').forEach((el) => {
    el.style.color = BRAND.blue
  })

  scope.querySelectorAll('.logo-circle').forEach((el) => {
    el.style.border = '2px solid #111111'
    el.style.borderRadius = '50%'
    el.style.background = `radial-gradient(circle at 30% 30%, rgba(45, 106, 79, 0.35), transparent 45%), radial-gradient(circle at 70% 70%, rgba(196, 30, 58, 0.35), transparent 45%)`
  })

  scope.querySelectorAll('.table-wrap').forEach((el) => {
    el.style.position = 'relative'
    el.style.overflow = 'hidden'
  })

  scope.querySelectorAll('.watermark').forEach((el) => {
    el.style.display = 'grid'
    el.style.visibility = 'visible'
    el.style.opacity = '1'
    el.style.color = 'rgba(196, 30, 58, 0.18)'
    el.style.fontWeight = '800'
    el.style.fontSize = '9rem'
    el.style.zIndex = '0'
    el.style.pointerEvents = 'none'
  })

  scope.querySelectorAll('.invoice-header').forEach((el) => {
    el.style.borderBottom = '2px solid #111111'
  })

  scope.querySelectorAll('.invoice-meta').forEach((el) => {
    el.style.borderBottom = '2px solid #111111'
  })

  scope.querySelectorAll('.meta-row').forEach((el) => {
    el.style.borderBottom = '1px solid #111111'
  })

  scope.querySelectorAll('.meta-field').forEach((el) => {
    el.style.borderRight = '1px solid #111111'
    el.style.borderBottom = '1px solid #111111'
  })

  scope.querySelectorAll('.signature-line').forEach((el) => {
    el.style.borderBottom = '1px solid #111111'
  })

  scope.querySelectorAll('.net-value, .total-label').forEach((el) => {
    el.style.fontWeight = '700'
  })
}

function getInvoiceSheet(root) {
  if (!root) return null
  return root.classList?.contains('invoice-sheet') ? root : root.querySelector('.invoice-sheet')
}

function prepareCaptureNode(root) {
  const sheet = getInvoiceSheet(root)
  if (!sheet) return root
  sheet.style.width = `${CAPTURE_WIDTH}px`
  sheet.style.maxWidth = `${CAPTURE_WIDTH}px`
  preservePreviewColors(sheet)
  applyBorderFixes(sheet)
  return root
}

function mountCaptureClone(sourceElement) {
  const host = document.createElement('div')
  host.className = 'pdf-capture-stage'
  host.setAttribute('aria-hidden', 'true')

  const clone = sourceElement.cloneNode(true)
  prepareCaptureNode(clone)
  host.appendChild(clone)
  document.body.appendChild(host)

  return { host, node: getInvoiceSheet(clone) || clone }
}

function isCanvasBlank(canvas) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) return true

  const ctx = canvas.getContext('2d')
  if (!ctx) return true

  const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 80), Math.min(canvas.height, 80)).data
  for (let i = 3; i < sample.length; i += 4) {
    if (sample[i] > 0) return false
  }
  return true
}

async function buildPdfFromElement(sourceElement) {
  if (!sourceElement) {
    throw new Error('Invoice preview not ready')
  }

  await document.fonts.ready
  await wait(isNative() ? 300 : 450)

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const fromLivePreview = Boolean(sourceElement.closest('.preview-modal'))
  let host = null
  let captureTarget = sourceElement

  if (!fromLivePreview) {
    const mounted = mountCaptureClone(sourceElement)
    host = mounted.host
    captureTarget = mounted.node
  } else {
    prepareCaptureNode(sourceElement)
    captureTarget = getInvoiceSheet(sourceElement) || sourceElement
  }

  try {
    const canvas = await html2canvas(captureTarget, {
      scale: getCaptureScale(),
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      imageTimeout: 15000,
      onclone: (_doc, clonedElement) => {
        prepareCaptureNode(clonedElement)
      },
    })

    if (isCanvasBlank(canvas)) {
      throw new Error('PDF capture was blank. Open Preview first, then try Save PDF again.')
    }

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL('image/png')
    const imgHeight = (canvas.height * pageWidth) / canvas.width

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight)
    } else {
      const fitWidth = (canvas.width * pageHeight) / canvas.height
      pdf.addImage(imgData, 'PNG', (pageWidth - fitWidth) / 2, 0, fitWidth, pageHeight)
    }

    canvas.width = 0
    canvas.height = 0

    return pdf
  } catch (error) {
    throw new Error(
      isNative()
        ? 'PDF failed — close other apps and try again.'
        : error?.message || 'Could not capture invoice preview',
    )
  } finally {
    host?.remove()
  }
}

function downloadPdfInBrowser(pdf, fileName) {
  pdf.save(fileName)
}

async function sharePdfOnPhone(pdf, fileName) {
  const blob = pdf.output('blob')

  if (navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'VS Invoice PDF',
          files: [file],
        })
        return { mode: 'share', fileName }
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { mode: 'cancelled', fileName }
      }
    }
  }

  const base64 = pdf.output('datauristring').split(',')[1]

  const writeResult = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  })

  let shareUri = writeResult.uri

  if (!shareUri?.startsWith('file://')) {
    const uriResult = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    })
    shareUri = uriResult.uri
  }

  const canShare = await Share.canShare()
  if (!canShare.value) {
    throw new Error('Sharing is not available on this device')
  }

  if (shareUri.startsWith('file://')) {
    await Share.share({
      title: 'VS Invoice PDF',
      files: [shareUri],
      dialogTitle: 'Save PDF to Downloads or WhatsApp',
    })
  } else {
    await Share.share({
      title: 'VS Invoice PDF',
      url: shareUri,
      dialogTitle: 'Save PDF to Downloads or WhatsApp',
    })
  }

  return { mode: 'share', fileName }
}

export function resolveInvoiceCaptureElement({ captureRef, previewRef }) {
  const modalSheet = document.querySelector('.preview-modal .invoice-sheet')
  if (modalSheet) return modalSheet

  const visibleSheet = previewRef?.current?.querySelector?.('.invoice-sheet')
  if (visibleSheet) return visibleSheet

  return captureRef?.current || null
}

export async function exportInvoice({ element, invoiceNumber = '' }) {
  const fileName = sanitizePdfFileName(invoiceNumber)
  const pdf = await buildPdfFromElement(element)

  if (isNative()) {
    return sharePdfOnPhone(pdf, fileName)
  }

  downloadPdfInBrowser(pdf, fileName)
  return { mode: 'download', fileName }
}

export async function prepareInvoiceForCapture() {
  await document.fonts.ready
  await wait(300)
}
