import { prisma } from "~~/server/utils/prisma";
import { getRouterParam, readBody, createError } from "h3";

const ROLE_HIERARCHY = {
  super_admin:4,
  admin: 3,
  manager: 2,
  user: 1,
} as const;

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID manquant",
    });
  }

  if (body?.roleId === undefined || body?.roleId === null) {
    throw createError({
      statusCode: 400,
      statusMessage: "roleId manquant",
    });
  }

  // utilisateur connecté
  const currentUser = event.context.user;

  if (!currentUser) {
    throw createError({
      statusCode: 401,
      statusMessage: "Non authentifié",
    });
  }

  try {
    // utilisateur ciblé
    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
      },
    });

    if (!targetUser) {
      throw createError({
        statusCode: 404,
        statusMessage: "Utilisateur introuvable",
      });
    }

    // nouveau rôle demandé
    const newRole = await prisma.role.findUnique({
      where: { id: body.roleId },
    });

    if (!newRole) {
      throw createError({
        statusCode: 404,
        statusMessage: "Rôle introuvable",
      });
    }

    // rôle utilisateur connecté
    const currentUserWithRole = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        role: true,
      },
    });

    if (!currentUserWithRole?.role?.code) {
      throw createError({
        statusCode: 403,
        statusMessage: "Rôle utilisateur invalide",
      });
    }

    const currentRoleCode = currentUserWithRole.role
      .code as keyof typeof ROLE_HIERARCHY;

    if (!targetUser.role?.code) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le rôle de l’utilisateur cible est invalide",
      });
    }

    const targetRoleCode = targetUser.role.code as keyof typeof ROLE_HIERARCHY;

    if (!newRole.code) {
      throw createError({
        statusCode: 400,
        statusMessage: "Le nouveau rôle est invalide",
      });
    }

    const newRoleCode = newRole.code as keyof typeof ROLE_HIERARCHY;
    const currentLevel = ROLE_HIERARCHY[currentRoleCode];
    const targetLevel = ROLE_HIERARCHY[targetRoleCode];
    const newRoleLevel = ROLE_HIERARCHY[newRoleCode];

    // interdit de se modifier soi-même
    if (currentUser.id === targetUser.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous ne pouvez pas modifier votre propre rôle",
      });
    }

    // interdit de modifier quelqu’un du même niveau ou supérieur
    if (currentLevel <= targetLevel) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous ne pouvez pas modifier cet utilisateur",
      });
    }

    // interdit de promouvoir quelqu’un à un niveau égal ou supérieur au sien
    if (newRoleLevel >= currentLevel) {
      throw createError({
        statusCode: 403,
        statusMessage: "Vous ne pouvez pas attribuer ce rôle",
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        roleId: body.roleId,
      },
      include: {
        role: true,
      },
    });

    return user;
  } catch (error: any) {
    console.error("Erreur update role:", error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de la mise à jour du rôle",
    });
  }
});
