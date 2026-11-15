import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'

export const COOKIE_NAME = 'vs_session'

export function signSession(user) {
  return jwt.sign({ sub: user.id, username: user.username }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: `${config.sessionHours}h`,
  })
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    maxAge: config.sessionHours * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  })
}

export function readSession(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
  } catch {
    return null
  }
}

export function requireAuth(req, _res, next) {
  const session = readSession(req)
  if (!session) return next(new AppError('Authentication required', 401))
  req.user = { id: session.sub, username: session.username }
  return next()
}
