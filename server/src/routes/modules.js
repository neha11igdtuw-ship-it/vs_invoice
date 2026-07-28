import { Router } from 'express'
import { asyncHandler, parsePagination } from '../lib/errors.js'
import {
  listRedBook,
  listLedger,
  listDayBook,
  listArrivals,
  createRedBook,
  updateRedBook,
  createLedgerEntry,
  updateLedgerEntry,
  createDayBookEntry,
  updateDayBookEntry,
  createArrival,
  updateArrival,
  getDayBookDailyTotals,
  deleteByModel,
  getByModel,
} from '../services/moduleService.js'

const router = Router()

function crudRoutes(path, listFn, createFn, updateFn, modelName) {
  const r = Router()
  r.get(
    '/',
    asyncHandler(async (req, res) => {
      const pagination = parsePagination(req.query)
      const result = await listFn({
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
  r.get(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await getByModel(modelName, req.params.id))
    }),
  )
  r.post(
    '/',
    asyncHandler(async (req, res) => {
      res.status(201).json(await createFn(req.body))
    }),
  )
  r.put(
    '/:id',
    asyncHandler(async (req, res) => {
      res.json(await updateFn(req.params.id, req.body))
    }),
  )
  r.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await deleteByModel(modelName, req.params.id)
      res.status(204).send()
    }),
  )
  return r
}

router.use('/red-book', crudRoutes('red-book', listRedBook, createRedBook, updateRedBook, 'redBookEntry'))
router.use('/ledger', crudRoutes('ledger', listLedger, createLedgerEntry, updateLedgerEntry, 'ledgerEntry'))
router.use('/arrivals', crudRoutes('arrivals', listArrivals, createArrival, updateArrival, 'arrival'))

router.get(
  '/day-book',
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query)
    const result = await listDayBook({
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
  '/day-book/daily-totals',
  asyncHandler(async (req, res) => {
    res.json(await getDayBookDailyTotals(req.query.financialYearId, req.query.date))
  }),
)

router.get(
  '/day-book/:id',
  asyncHandler(async (req, res) => {
    res.json(await getByModel('dayBookEntry', req.params.id))
  }),
)

router.post(
  '/day-book',
  asyncHandler(async (req, res) => {
    res.status(201).json(await createDayBookEntry(req.body))
  }),
)

router.put(
  '/day-book/:id',
  asyncHandler(async (req, res) => {
    res.json(await updateDayBookEntry(req.params.id, req.body))
  }),
)

router.delete(
  '/day-book/:id',
  asyncHandler(async (req, res) => {
    await deleteByModel('dayBookEntry', req.params.id)
    res.status(204).send()
  }),
)

export default router
