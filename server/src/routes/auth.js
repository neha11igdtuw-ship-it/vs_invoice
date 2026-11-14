import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { AppError, asyncHandler } from '../lib/errors.js'
import {
  clearSessionCookie,
  readSession,
  setSessionCookie,
  signSession,
} from '../middleware/auth.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
})

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

// Compared against when the user does not exist, so response time doesn't reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError('Username and password are required', 400)

    const { username, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { username } })
    const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH)
    if (!user || !valid) throw new AppError('Wrong username or password', 401)

    setSessionCookie(res, signSession(user))
    res.json({ username: user.username })
  }),
)

router.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

router.get('/me', (req, res) => {
  const session = readSession(req)
  if (!session) return res.status(401).json({ error: 'Authentication required' })
  return res.json({ username: session.username })
})

export default router
