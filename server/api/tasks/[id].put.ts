import type { HeadersInit } from 'undici'
export default defineEventHandler(async (event) => {
const session = await auth.api.getSession({
  headers: new Headers(event.node.req.headers as HeadersInit)
})
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID invalide' })
  }

  // ── NORMALISATION (IMPORTANT) ─────────────────────
  const statusId =
    typeof body.statusId === 'object'
      ? body.statusId?.value
      : body.statusId

  const privilegeId =
    typeof body.privilegeId === 'object'
      ? body.privilegeId?.value
      : body.privilegeId

  console.log('BODY:', body)
  console.log('statusId:', statusId, 'privilegeId:', privilegeId)

  // ── VALIDATION ────────────────────────────────────
  const existing = await prisma.task.findUnique({ where: { id } })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Tâche introuvable' })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  })

  const isAdmin = currentUser?.role?.code === 'admin'

  if (!isAdmin && existing.createdBy !== session.user.id) {
    throw createError({
      statusCode: 403,
      message: 'Vous ne pouvez modifier que vos propres tâches'
    })
  }

  // ── UPDATE TASK ───────────────────────────────────
  const task = await prisma.task.update({
    where: { id },
    data: {
      title: body.title?.trim(),
      description: body.description?.trim() || null,
      statusId: statusId ? Number(statusId) : undefined,
      privilegeId: privilegeId ? Number(privilegeId) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedTo: body.assignedTo || null,
      updatedAt: new Date(),
    },
    include: {
      status: true,
      privilege: true,
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    }
  })

  return task
})