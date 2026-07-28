import { Router } from 'express'
import { asyncHandler, parsePagination } from '../lib/errors.js'
import {
  listTeeps,
  getTeep,
  createTeep,
  updateTeep,
  deleteTeep,
  getTeepDailySummary,
  getTeepCustomerBill,
} from '../services/teepService.js'

const router = Router()

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query)
    const result = await listTeeps({
      financialYearId: req.query.financialYearId,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      skip: pagination.skip,
      take: pagination.take,
    })
    res.json({ ...result, page: pagination.page, pageSize: pagination.pageSize })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getTeep(req.params.id))
  }),
)

router.get(
  '/:id/summary',
  asyncHandler(async (req, res) => {
    const teep = await getTeep(req.params.id)
    res.json(getTeepDailySummary(teep))
  }),
)

router.get(
  '/customers/:customerId/bill',
  asyncHandler(async (req, res) => {
    res.json(await getTeepCustomerBill(req.params.customerId))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await createTeep(req.body))
  }),
)

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await updateTeep(req.params.id, req.body))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteTeep(req.params.id)
    res.status(204).send()
  }),
)

export default router
