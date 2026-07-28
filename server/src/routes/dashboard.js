import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { asyncHandler, parsePagination, AppError } from '../lib/errors.js'
import { getDashboardSummary } from '../services/dashboardService.js'

const router = Router()

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const financialYearId = req.query.financialYearId
    if (!financialYearId) throw new AppError('financialYearId is required')
    const summary = await getDashboardSummary(financialYearId)
    res.json(summary)
  }),
)

router.get(
  '/financial-years',
  asyncHandler(async (_req, res) => {
    const years = await prisma.financialYear.findMany({ orderBy: { startDate: 'desc' } })
    res.json(years)
  }),
)

router.post(
  '/financial-years',
  asyncHandler(async (req, res) => {
    const { name, startDate, endDate, isActive } = req.body
    if (!name || !startDate || !endDate) {
      throw new AppError('Name, startDate and endDate are required')
    }

    const year = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.financialYear.updateMany({ data: { isActive: false } })
      }
      return tx.financialYear.create({
        data: {
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: Boolean(isActive),
        },
      })
    })

    res.status(201).json(year)
  }),
)

router.patch(
  '/financial-years/:id/activate',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const year = await prisma.$transaction(async (tx) => {
      await tx.financialYear.updateMany({ data: { isActive: false } })
      return tx.financialYear.update({ where: { id }, data: { isActive: true } })
    })
    res.json(year)
  }),
)

export default router
