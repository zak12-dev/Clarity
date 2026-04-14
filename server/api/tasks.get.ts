import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler(async () => {
  return await prisma.task.findMany({
    include: {
      assignee: { select: { id: true, name: true } },
      creator:  { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  })
})