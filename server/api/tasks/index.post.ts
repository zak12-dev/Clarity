import type { HeadersInit } from 'undici'

export default defineEventHandler(async (event) => {

  // ── SESSION ──────────────────────────────
const session = await auth.api.getSession({
  headers: new Headers(event.node.req.headers as HeadersInit)
})
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const body = await readBody(event)

  // ── NORMALISATION SAFE (IMPORTANT FIX) ───
  const rawStatusId = body.statusId
  const rawPrivilegeId = body.privilegeId

  const statusId =
    typeof rawStatusId === 'object'
      ? rawStatusId?.value
      : rawStatusId

  const privilegeId =
    typeof rawPrivilegeId === 'object'
      ? rawPrivilegeId?.value
      : rawPrivilegeId

  const statusIdNumber = Number(statusId)
  const privilegeIdNumber = Number(privilegeId)

  console.log('BODY:', body)
  console.log('statusId:', statusIdNumber, 'privilegeId:', privilegeIdNumber)

  // ── VALIDATION ROBUSTE ───────────────────
  if (!body.title?.trim()) {
    throw createError({
      statusCode: 422,
      message: 'Le titre est obligatoire'
    })
  }

  if (!Number.isInteger(statusIdNumber)) {
    throw createError({
      statusCode: 422,
      message: 'Statut invalide'
    })
  }

  if (!Number.isInteger(privilegeIdNumber)) {
    throw createError({
      statusCode: 422,
      message: 'Priorité invalide'
    })
  }

  // ── CHECK DB ──────────────────────────────
  const [status, privilege] = await Promise.all([
    prisma.status.findUnique({
      where: { id: statusIdNumber }
    }),
    prisma.privilege.findUnique({
      where: { id: privilegeIdNumber }
    }),
  ])

  if (!status) {
    throw createError({
      statusCode: 404,
      message: 'Statut introuvable'
    })
  }

  if (!privilege) {
    throw createError({
      statusCode: 404,
      message: 'Priorité introuvable'
    })
  }

  console.log('Status OK:', status)
  console.log('Privilege OK:', privilege)

  // ── CREATE TASK ───────────────────────────
  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      statusId: statusIdNumber,
      privilegeId: privilegeIdNumber,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedTo: body.assignedTo || null,
      createdBy: session.user.id,
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