import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const jwtSecret = required('JWT_SECRET')
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production')
}

export const config = {
  isProduction,
  port: Number(process.env.PORT) || 3001,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  // Session lifetime in hours.
  sessionHours: Number(process.env.SESSION_HOURS) || 12,
  // Comma-separated list. Leave empty when the API and frontend share one origin (default).
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  adminUsername: process.env.ADMIN_USERNAME || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
}
