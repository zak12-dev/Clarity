import { createAuthClient } from "better-auth/client";

// =====================
// TYPES
// =====================
export interface CustomSession {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    roleId: number;
    createdAt: string;
    updatedAt: string;
  };
  expires?: string;
}

type Role = "admin" | "user";

// =====================
// CLIENT SINGLETON
// ✅ En dehors du composable pour éviter de recréer à chaque appel
// =====================
const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000",
  fetchOptions: { credentials: "include" },
});

// =====================
// COMPOSABLE
// =====================
export const useAuth = () => {
  // Session globale partagée entre tous les composants
 const session = useState<CustomSession | null>("session", () => null)

const user = computed(() => session.value?.user ?? null)
  /* =====================
     INSCRIPTION
  ===================== */
  const createUser = async (
    name: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => {
    if (password !== confirmPassword) {
      throw new Error("Les mots de passe ne correspondent pas");
    }

    const tokenReady = ref(false);

    const refreshCaptcha = () => {
      if ((window as any).turnstile) {
        (window as any).turnstile.reset();
        tokenReady.value = false;
        setTimeout(() => {
          tokenReady.value = true;
        }, 100); // attendre que le token soit prêt
      }
    };

    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/auth/login", // ✅ Rediriger vers dashboard après inscription
    });

    if (result?.error) throw new Error(result.error.message);

    // Charger la session immédiatement après inscription
    await fetchSession();
    return result;
  };

  /* =====================
     CONNEXION EMAIL
  ===================== */
  const loginWithEmail = async (
    email: string,
    password: string,
    rememberMe = true,
  ) => {
    const result = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    });

    if (result?.error) throw new Error(result.error.message);

    await fetchSession();
  };

  /* =====================
     DÉCONNEXION
  ===================== */
  const logout = async () => {
    await authClient.signOut();
    session.value = null;
    await navigateTo("/login");
  };

  /* =====================
     FETCH SESSION
  ===================== */
  const fetchSession = async () => {
    try {
      // ✅ Correction : /api/auth/me et non /api/me
      const data = await $fetch<CustomSession>("/api/auth/me", {
        credentials: "include",
      });
      session.value = data ?? null;
    } catch {
      session.value = null;
    }
  };

  /* =====================
     RÔLES
  ===================== */
  const role = computed<Role | null>(() => {
    if (!session.value) return null;
    switch (session.value.user.roleId) {
      case 1:
        return "admin";
      case 2:
        return "user";
      default:
        return "user";
    }
  });

  const isAdmin = computed(() => role.value === "admin");
  const isUser = computed(() => role.value === "user");

  return {
    // State
    session,
     user, 

    // Auth
    loginWithEmail,
    createUser,
    logout,

    // Session
    fetchSession,

    // Rôles
    role,
    isAdmin,
    isUser,
  };
};
