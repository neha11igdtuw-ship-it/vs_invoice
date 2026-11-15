import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import prisma from './lib/prisma.js'
import { bootstrap } from './bootstrap.js'
import { errorHandler, notFoundHandler } from './lib/errors.js'
import { requireAuth } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import invoiceRoutes from './routes/invoices.js'
import moduleRoutes from './routes/modules.js'
import teepRoutes from './routes/teep.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../../dist')

// Render (and most hosts) terminate TLS at a proxy; needed for secure cookies and rate limiting.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
)
app.use(compression())
app.use(morgan(config.isProduction ? 'combined' : 'dev'))

if (config.corsOrigins.length > 0) {
  app.use(cors({ origin: config.corsOrigins, credentials: true }))
}

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Health check for Render. Verifies the database is reachable.
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.user.count()
    res.json({ status: 'ok' })
  } catch {
    res.status(503).json({ status: 'unavailable' })
  }
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
})

app.use('/api', apiLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/dashboard', requireAuth, dashboardRoutes)
app.use('/api/invoices', requireAuth, invoiceRoutes)
app.use('/api/modules', requireAuth, moduleRoutes)
app.use('/api/teep', requireAuth, teepRoutes)
app.use('/api', notFoundHandler)

// Serve the built frontend (single-service deploy). Skipped in local dev, where Vite serves it.
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }))
  app.use(express.static(distDir, { maxAge: '1h' }))
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use(errorHandler)

const server = await (async () => {
  await prisma.$connect()
  await bootstrap()
  return app.listen(config.port, () => {
    console.log(`VS Invoice running on port ${config.port} (${config.isProduction ? 'production' : 'development'})`)
  })
})()

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
