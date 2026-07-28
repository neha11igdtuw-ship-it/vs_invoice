import express from 'express'
import cors from 'cors'
import dashboardRoutes from './routes/dashboard.js'
import invoiceRoutes from './routes/invoices.js'
import moduleRoutes from './routes/modules.js'
import teepRoutes from './routes/teep.js'
import { errorHandler } from './lib/errors.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/dashboard', dashboardRoutes)
app.use('/api/invoices', invoiceRoutes)
app.use('/api/modules', moduleRoutes)
app.use('/api/teep', teepRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`VS Invoice API running on http://localhost:${PORT}`)
})
