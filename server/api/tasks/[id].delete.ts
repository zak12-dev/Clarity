import pkg from '@prisma/client'
import { requireAuth } from "~~/server/utils/protect";

const { PrismaClient } = pkg

import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' })
  }

  // ── Récupérer la session utilisateur connecté ──────────
  // Si vous utilisez nuxt-auth-utils → remplacez par getUserSession(event)
  const user = requireAuth(event);
    const currentUserId: number | null = user?.id ?? null

  if (!currentUserId) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  // ── Vérifier que la tâche existe ──────────────────────
  const task = await prisma.task.findUnique({ where: { id } })

  if (!task) {
    throw createError({ statusCode: 404, message: 'Tâche introuvable' })
  }

  // ── Vérifier que l'utilisateur est bien le CRÉATEUR ───
  // Un utilisateur ne peut supprimer QUE les tâches qu'il a créées,
  // pas celles qui lui sont simplement assignées.
  if (task.createdBy !== currentUserId) {
    throw createError({
      statusCode: 403,
      message: 'Interdit : vous ne pouvez supprimer que les tâches que vous avez créées'
    })
  }

  // ── Suppression ───────────────────────────────────────
  await prisma.task.delete({ where: { id } })

  return { success: true, message: 'Tâche supprimée avec succès' }
})