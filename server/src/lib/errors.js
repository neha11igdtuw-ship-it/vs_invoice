export class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500
  res.status(status).json({
    error: err.message || 'Internal server error',
  })
}

export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date')
  }
  return date
}

export function requireFinancialYearId(req) {
  const id = req.query.financialYearId || req.body.financialYearId
  if (!id) throw new AppError('financialYearId is required')
  return id
}
