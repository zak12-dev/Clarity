import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  }

  try {
    // Désassigner les tâches liées avant suppression
    await prisma.task.updateMany({
      where: { assignedTo: id },
      data:  { assignedTo: null },
    })

    await prisma.user.delete({ where: { id } })

    return { success: true }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de la suppression de l'utilisateur",
    })
  }
})