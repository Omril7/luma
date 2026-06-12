// Seed script — placeholder for M1.2
// Run: npm run db:seed  (after db:migrate has created the tables)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed script is a placeholder — full seed arrives in M1.2')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
