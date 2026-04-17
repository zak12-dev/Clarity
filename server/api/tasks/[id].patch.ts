import { PrismaClient } from '@prisma/client'

import { prisma } from '~~/server/utils/prisma'
export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' })
  }

  // Retrouver le status par son code (ex: 'done')
  const status = await prisma.status.findUnique({
    where: { code: body.statusCode }
  })

  if (!status) {
    throw createError({ statusCode: 404, message: `Statut "${body.statusCode}" introuvable` })
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      statusId:  status.id,
      updatedAt: new Date(),
    },
    include: {
      status:    true,
      privilege: true,
      assignee:  { select: { id: true, name: true } },
      creator:   { select: { id: true, name: true } },
    }
  })

  return task
})