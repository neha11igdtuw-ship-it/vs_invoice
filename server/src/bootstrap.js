import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'
import { config } from './config.js'

// Idempotent first-run setup, safe to run on every boot.
export async function bootstrap() {
  if ((await prisma.financialYear.count()) === 0) {
    const now = new Date()
    // Indian financial year: 1 April to 31 March.
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
    await prisma.financialYear.create({
      data: {
        name: `${startYear}-${String(startYear + 1).slice(2)}`,
        startDate: new Date(Date.UTC(startYear, 3, 1)),
        endDate: new Date(Date.UTC(startYear + 1, 2, 31)),
        isActive: true,
      },
    })
    console.log('Created default financial year')
  }

  if ((await prisma.user.count()) === 0) {
    if (!config.adminUsername || !config.adminPassword) {
      console.warn(
        'No users exist. Set ADMIN_USERNAME and ADMIN_PASSWORD to create the first login.',
      )
      return
    }
    if (config.adminPassword.length < 8) {
      throw new Error('ADMIN_PASSWORD must be at least 8 characters')
    }
    await prisma.user.create({
      data: {
        username: config.adminUsername,
        passwordHash: await bcrypt.hash(config.adminPassword, 12),
      },
    })
    console.log(`Created admin user "${config.adminUsername}"`)
  }
}
