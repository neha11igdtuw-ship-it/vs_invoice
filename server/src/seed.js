import prisma from './lib/prisma.js'

async function main() {
  const existing = await prisma.financialYear.count()
  if (existing > 0) {
    console.log('Database already seeded')
    return
  }

  await prisma.financialYear.create({
    data: {
      name: '2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isActive: true,
    },
  })

  console.log('Seeded default financial year 2026-27')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
