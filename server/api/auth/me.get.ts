import { auth } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  // ✅ Passer les headers directement sans cast
  const session = await auth.api.getSession({
    headers: event.headers
  })
  console.log('Session:', session)

  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  // ✅ Suppression du omit: {} vide qui cause une erreur Prisma
  const user = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { role: true },
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })
  }

  return {
    user: {
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    }
  }
})