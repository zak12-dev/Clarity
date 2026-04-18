import type { HeadersInit } from 'undici'
import { ROLES } from '~~/server/constants/roles'
import { sendTaskAssignedEmail } from '~~/server/utils/mailer'

export default defineEventHandler(async (event) => {

  // ── SESSION ──────────────────────────────
  const session = await auth.api.getSession({
    headers: new Headers(event.node.req.headers as HeadersInit)
  })

  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Non authentifié' })
  }

  const body = await readBody(event)

  // ── NORMALISATION SAFE ───────────────────
  const rawStatusId    = body.statusId
  const rawPrivilegeId = body.privilegeId
  const rawAssignedTo  = body.assignedTo

  const statusId    = typeof rawStatusId === 'object' ? rawStatusId?.value : rawStatusId
  const privilegeId = typeof rawPrivilegeId === 'object' ? rawPrivilegeId?.value : rawPrivilegeId
  const assignedTo  =
    typeof rawAssignedTo === 'object' && rawAssignedTo !== null
      ? rawAssignedTo?.value
      : rawAssignedTo

  const statusIdNumber    = Number(statusId)
  const privilegeIdNumber = Number(privilegeId)

  // ── VALIDATION ───────────────────────────
  if (!body.title?.trim()) {
    throw createError({ statusCode: 422, message: 'Le titre est obligatoire' })
  }

  if (!Number.isInteger(statusIdNumber)) {
    throw createError({ statusCode: 422, message: 'Statut invalide' })
  }

  if (!Number.isInteger(privilegeIdNumber)) {
    throw createError({ statusCode: 422, message: 'Priorité invalide' })
  }

  // ── USER CONNECTÉ AVEC RÔLE ──────────────
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true }
  })

  if (!currentUser?.role?.code) {
    throw createError({ statusCode: 403, message: 'Rôle utilisateur invalide' })
  }

  // ── CHECK UTILISATEUR ASSIGNÉ ────────────
  let targetUser: any = null

  if (assignedTo) {
    targetUser = await prisma.user.findUnique({
      where: { id: assignedTo },
      include: { role: true }
    })

    if (!targetUser?.role?.code) {
      throw createError({ statusCode: 404, message: 'Utilisateur assigné introuvable' })
    }

    const currentLevel = ROLES[currentUser.role.code as keyof typeof ROLES] ?? 0
    const targetLevel  = ROLES[targetUser.role.code as keyof typeof ROLES] ?? 0

    if (currentLevel < 2 || currentLevel < targetLevel) {
      throw createError({
        statusCode: 403,
        message: "Vous n'avez pas le droit d'assigner à cet utilisateur"
      })
    }
  }

  // ── CHECK DB ──────────────────────────────
  const [status, privilege] = await Promise.all([
    prisma.status.findUnique({ where: { id: statusIdNumber } }),
    prisma.privilege.findUnique({ where: { id: privilegeIdNumber } }),
  ])

  if (!status) {
    throw createError({ statusCode: 404, message: 'Statut introuvable' })
  }

  if (!privilege) {
    throw createError({ statusCode: 404, message: 'Priorité introuvable' })
  }

  // ── CREATE TASK ───────────────────────────
  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      statusId: statusIdNumber,
      privilegeId: privilegeIdNumber,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedTo: assignedTo || null,
      createdBy: session.user.id,
    },
    include: {
      status: true,
      privilege: true,
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true } },
    }
  })

  // ── ENVOI EMAIL SI UTILISATEUR ASSIGNÉ ───
  if (task.assignee?.email) {
    await sendTaskAssignedEmail(
      task.assignee.email,
      task.title,
      task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('fr-FR')
        : 'Non définie'
    )
  }

  return task
})