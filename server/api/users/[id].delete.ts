import { prisma } from '~~/server/utils/prisma'
import { getRouterParam, createError } from 'h3'
import { ROLES } from '~~/server/constants/roles'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID manquant',
    })
  }

  // 🔐 utilisateur connecté
  const currentUser = event.context.user

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Non authentifié',
    })
  }

  // 👤 récupérer utilisateur connecté avec rôle
  const currentUserWithRole = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { role: true },
  })

  // 👤 récupérer utilisateur cible
  const targetUser = await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  })

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Utilisateur introuvable',
    })
  }

  if (!currentUserWithRole?.role?.code || !targetUser.role?.code) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Rôle invalide',
    })
  }

  // 🔥 utilisation du fichier central ROLES
  const currentLevel =
    ROLES[currentUserWithRole.role.code as keyof typeof ROLES]

  const targetLevel =
    ROLES[targetUser.role.code as keyof typeof ROLES]

  // ❌ 1. impossible de se supprimer soi-même
  if (currentUser.id === targetUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Vous ne pouvez pas vous supprimer vous-même',
    })
  }

  // ❌ 2. impossible de supprimer un utilisateur de niveau égal ou supérieur
  if (currentLevel <= targetLevel) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Action non autorisée sur cet utilisateur',
    })
  }

  try {
    // 🔁 désassignation des tâches
  await prisma.task.updateMany({
  where: { assignedTo: id },
  data: { assignedTo: null },
})

await prisma.task.updateMany({
  where: { createdBy: id },
  data: { createdBy: null },
})
    // 🗑 suppression utilisateur
    await prisma.user.delete({ where: { id } })

    return { success: true }
  } catch (error) {
    console.error('DELETE USER ERROR:', error)
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de la suppression de l'utilisateur",
    })
  }
})