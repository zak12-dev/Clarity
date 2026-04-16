import { auth } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  // Laisser passer toutes les routes better-auth sans vérification
  if (event.path.startsWith("/api/auth")) return;

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (session) {
    // ✅ Suppression du check session.user.status qui n'existe pas dans le schéma
    event.context.session = session.session;
    event.context.user    = session.user;
  } else {
    event.context.session = null;
    event.context.user    = null;
  }
});