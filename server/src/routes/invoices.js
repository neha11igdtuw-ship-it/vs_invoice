import { Router } from 'express'
import { asyncHandler, parsePagination } from '../lib/errors.js'
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  cancelInvoice,
  deleteInvoice,
  invoiceToFormState,
} from '../services/invoiceService.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query)
    const result = await listInvoices({
      financialYearId: req.query.financialYearId,
      search: req.query.search,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      skip: pagination.skip,
      take: pagination.take,
    })
    res.json({ ...result, page: pagination.page, pageSize: pagination.pageSize })
  }),
)

router.get(
  '/:id/form-state',
  asyncHandler(async (req, res) => {
    const invoice = await getInvoice(req.params.id)
    res.json(invoiceToFormState(invoice))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await getInvoice(req.params.id)
    res.json(invoice)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const invoice = await createInvoice(req.body)
    res.status(201).json(invoice)
  }),
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await updateInvoice(req.params.id, req.body)
    res.json(invoice)
  }),
)

router.post(
  '/:id/cancel',
  asyncHandler(async (req, res) => {
    const invoice = await cancelInvoice(req.params.id)
    res.json(invoice)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteInvoice(req.params.id)
    res.status(204).send()
  }),
)

export default router
