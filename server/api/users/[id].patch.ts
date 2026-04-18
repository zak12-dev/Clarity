import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  if (!body?.roleId && body?.roleId !== null)
    throw createError({ statusCode: 400, statusMessage: 'roleId manquant' })

  try {
    const user = await prisma.user.update({
      where: { id },
      data:  { roleId: body.roleId },
      include: { role: true },
    })
    return user
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la mise à jour du rôle',
    })
  }
})