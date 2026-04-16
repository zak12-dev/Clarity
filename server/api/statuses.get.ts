import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    return await prisma.status.findMany({
      orderBy: { id: 'asc' },
    })
  } catch (error) {
    console.error('Erreur statuses:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des statuts',
    })
  }
})