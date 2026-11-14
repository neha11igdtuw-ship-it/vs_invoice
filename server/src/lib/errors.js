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

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500

  // Prisma: malformed ObjectId, record missing, unique violation.
  if (err.code === 'P2023') status = 400
  else if (err.code === 'P2025') status = 404
  else if (err.code === 'P2002') status = 409

  if (err.type === 'entity.parse.failed') status = 400
  if (err.type === 'entity.too.large') status = 413

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err)
    return res.status(500).json({ error: 'Internal server error' })
  }

  const messages = {
    P2023: 'Invalid id',
    P2025: 'Record not found',
    P2002: 'A record with these details already exists',
  }
  const message = messages[err.code] || (err.type ? 'Invalid request' : err.message)
  return res.status(status).json({ error: message || 'Request failed' })
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
