import pkg from '@prisma/client'

const { PrismaClient } = pkg
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const account = await prisma.account.findFirst({
    where: {
      providerId: 'credentials',
      accountId: 'admin@app.com'
    },
    include: {
      user: true
    }
  })

  console.log('ACCOUNT =>', account)

  if (account?.password) {
    const ok = await bcrypt.compare('admin123', account.password)
    console.log('PASSWORD OK =>', ok)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())