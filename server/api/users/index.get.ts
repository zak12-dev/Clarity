import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async () => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return users
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la récupération des utilisateurs',
    })
  }
})