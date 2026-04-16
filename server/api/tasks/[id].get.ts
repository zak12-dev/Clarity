import pkg from '@prisma/client'

import { auth } from '~~/server/utils/auth'
import type { HeadersInit } from 'undici'
const { PrismaClient } = pkg

import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {

  // ── Vérification session ──────────────────────────────
const session = await auth.api.getSession({
  headers: new Headers(
    Object.fromEntries(
      Object.entries(event.node.req.headers).filter(([, v]) => v)
    ) as Record<string, string>
  )
})
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' })
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      status:    true,
      privilege: true,
      assignee:  { select: { id: true, name: true } },
      creator:   { select: { id: true, name: true } },
    }
  })

  if (!task) {
    throw createError({ statusCode: 404, message: 'Tâche introuvable' })
  }

  // Un utilisateur simple ne peut voir que ses tâches (créées ou assignées)
  const currentUser = await prisma.user.findUnique({
    where:   { id: session.user.id },
    include: { role: true }
  })
  const isAdmin = currentUser?.role?.code === 'admin'

  if (!isAdmin && task.createdBy !== session.user.id && task.assignedTo !== session.user.id) {
    throw createError({ statusCode: 403, message: 'Accès interdit à cette tâche' })
  }

  return task
})