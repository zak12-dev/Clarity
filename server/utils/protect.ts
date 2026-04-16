import { H3Event } from "h3";

/**
 * S'assure que l'utilisateur est authentifié
 */
export const requireAuth = (event: H3Event) => {
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized: You must be logged in.",
    });
  }
  return event.context.user;
};

/**
 * S'assure que l'utilisateur a le rôle admin.
 */
export const requireAdmin = (event: H3Event) => {
  const user = requireAuth(event);

  // Selon notre seed : 1 = admin
  if (user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden: Admin access required.",
    });
  }
  return user;
};

/**
 * S'assure que l'utilisateur a le rôle organisateur ou administrateur.
 */
export const requireOrganizer = (event: H3Event) => {
  const user = requireAuth(event);

  // Selon notre seed : 1 = admin, 2 = organisateur
  if (user.roleId !== 1 && user.roleId !== 2) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden: Organizer access required.",
    });
  }
  return user;
};

