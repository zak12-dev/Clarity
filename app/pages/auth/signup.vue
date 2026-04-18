<script setup lang="ts">
definePageMeta({ layout: "auth" });

import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { onMounted, ref, computed } from "vue";
import { useToast } from "#imports";
import { useAuth } from "../../../composables/useAuth";

const showPassword = ref(false);
const showConfirm = ref(false);
const toast = useToast();
const loading = ref(false);
const loadingProvider = ref<string | null>(null);
const config = useRuntimeConfig();

const { createUser, loginWithGoogle, loginWithFacebook } = useAuth();

// ── Schema ──
const schema = z
  .object({
    name: z.string().min(3, "Nom trop court"),
    email: z.string().email("Email invalide"),
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const pwd = data.password;
    if (pwd.length < 8)
      ctx.addIssue({
        path: ["password"],
        message: "Au moins 8 caractères",
        code: z.ZodIssueCode.custom,
      });
    if (!/[A-Z]/.test(pwd))
      ctx.addIssue({
        path: ["password"],
        message: "Au moins une majuscule",
        code: z.ZodIssueCode.custom,
      });
    if (!/[0-9]/.test(pwd))
      ctx.addIssue({
        path: ["password"],
        message: "Au moins un chiffre",
        code: z.ZodIssueCode.custom,
      });
    if (!/[!@#$%^&*]/.test(pwd))
      ctx.addIssue({
        path: ["password"],
        message: "Au moins un caractère spécial",
        code: z.ZodIssueCode.custom,
      });
    if (data.password !== data.confirmPassword)
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Les mots de passe ne correspondent pas",
        code: z.ZodIssueCode.custom,
      });
  });
type Schema = z.infer<typeof schema>;

const state = ref({ name: "", email: "", password: "", confirmPassword: "" });

// ── Force mot de passe ──
const checks = computed(() => ({
  length: state.value.password.length >= 8,
  upper: /[A-Z]/.test(state.value.password),
  number: /[0-9]/.test(state.value.password),
  special: /[!@#$%^&*]/.test(state.value.password),
}));

const passwordStrength = computed(
  () => Object.values(checks.value).filter(Boolean).length,
);

const strengthLabel = computed(() => {
  const s = passwordStrength.value;
  if (!s || !state.value.password) return null;
  if (s <= 1) return { text: "Faible", color: "#dc2626" };
  if (s <= 2) return { text: "Moyen", color: "#ea6c1e" };
  if (s <= 3) return { text: "Bien", color: "#f59e0b" };
  return { text: "Fort", color: "#059669" };
});

// ── Social login ──
const handleSocial = async (provider: "Google" | "Facebook") => {
  loadingProvider.value = provider;
  try {
    if (provider === "Google") await loginWithGoogle();
    if (provider === "Facebook") await loginWithFacebook();
  } catch {
    toast.add({ title: `Erreur de connexion ${provider}`, color: "error" });
  } finally {
    loadingProvider.value = null;
  }
};

// ── Captcha ──
const tokenReady = ref(false);
let turnstileWidgetId: number | null = null;

const refreshCaptcha = () => {
  const container = document.querySelector(".cf-turnstile");
  if ((window as any).turnstile && container) {
    if (turnstileWidgetId !== null) {
      (window as any).turnstile.reset(turnstileWidgetId);
    } else {
      turnstileWidgetId = (window as any).turnstile.render(container, {
        sitekey: config.public.turnstileSiteKey,
        callback: () => {
          tokenReady.value = true;
        },
        "expired-callback": () => {
          tokenReady.value = false;
        },
      });
    }
  }
};

// ── Submit ──
async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!tokenReady.value) {
    toast.add({
      title: "Captcha en cours",
      description: "Veuillez patienter...",
      color: "warning",
    });
    return;
  }
  const token = (window as any).turnstile?.getResponse();
  if (!token) {
    toast.add({
      title: "Captcha requis",
      description: "Veuillez valider le captcha.",
      color: "warning",
    });
    return;
  }
  loading.value = true;
  try {
    await $fetch("/api/cloudflare/verify-turnstile", {
      method: "POST",
      body: { token },
    });
    const { name, email, password, confirmPassword } = event.data;
    await createUser(name, email, password, confirmPassword);
    toast.add({
      title: "Compte créé avec succès",
      color: "success",
    });
    await navigateTo("/auth/login");
  } catch (e: any) {
    refreshCaptcha();
    let message = "Erreur lors de l'inscription";
    if (e?.message?.includes("already exists"))
      message = "Cette adresse e-mail est déjà associée à un compte.";
    else if (e?.message) message = e.message;
    toast.add({ title: message, color: "error" });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshCaptcha();
});
</script>

<template>
  <div class="auth-root">
    <!-- ── Fond décoratif ── -->
    <div class="auth-bg" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="grid-overlay" />
    </div>

    <div class="auth-layout">
      <!-- ── Colonne gauche — branding ── -->
      <aside class="auth-brand">
        <NuxtLink to="/" class="brand-logo">
          <div
            class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
          >
            <span class="text-white font-bold text-sm">C</span>
          </div>

          <span class="brand-name">Clarity</span>
        </NuxtLink>

        <div class="brand-content">

            <p class="brand-eyebrow">Rejoignez la communauté</p>

          <h2 class="brand-headline">Créez votre compte<br />en 2 minutes.</h2>
          <p class="brand-sub">
            Accédez à tous l'outils de gestion de taches dès votre
            inscription.
          </p>
        </div>

        <!-- Étapes d'inscription 
        <div class="brand-steps">
          <div class="step-item">
            <div class="step-num">1</div>
            <div>
              <p class="step-title">Renseignez vos infos</p>
              <p class="step-desc">Nom, email et mot de passe sécurisé</p>
            </div>
          </div>
          <div class="step-connector" />
          <div class="step-item">
            <div class="step-num">2</div>
            <div>
              <p class="step-title">Vérifiez votre email</p>
              <p class="step-desc">Un lien de confirmation vous sera envoyé</p>
            </div>
          </div>
          <div class="step-connector" />
          <div class="step-item">
            <div class="step-num" style="background: linear-gradient(135deg,#ea6c1e,#5b47e0); color:white; border-color: transparent;">3</div>
            <div>
              <p class="step-title">C'est parti !</p>
              <p class="step-desc">Gérez vos taches sans friction</p>
            </div>
          </div>
        </div>-->

        <p class="brand-footer">© 2026 S Clarity — Tous droits réservés</p>
      </aside>

      <!-- ── Colonne droite — formulaire ── -->
      <main class="auth-form-col">
        <div class="form-card">
          <!-- En-tête -->
          <div class="form-header">
            <div class="form-header-top">
              <div class="secure-badge">
                <span class="secure-dot" />
                Inscription sécurisée
              </div>
            </div>
            <h1 class="form-title">Créer un compte</h1>
            <p class="form-subtitle">
              Rejoignez des milliers d'autres personnes.
            </p>
          </div>

          <!-- Formulaire -->
          <UForm
            :schema="schema"
            :state="state"
            @submit="onSubmit"
            class="form-fields"
          >
            <!-- Nom -->
            <UFormField name="name" class="field-group">
              <label class="field-label">Nom complet</label>
              <div class="field-wrap">
                <svg
                  class="field-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  v-model="state.name"
                  type="text"
                  placeholder="Votre nom complet"
                  autocomplete="name"
                  autofocus
                  :disabled="loading"
                  class="field-input"
                />
              </div>
            </UFormField>

            <!-- Email -->
            <UFormField name="email" class="field-group">
              <label class="field-label">Adresse email</label>
              <div class="field-wrap">
                <svg
                  class="field-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                  />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  v-model="state.email"
                  type="email"
                  placeholder="votre@email.com"
                  autocomplete="email"
                  :disabled="loading"
                  class="field-input"
                />
              </div>
            </UFormField>

            <!-- Mot de passe -->
            <UFormField name="password" class="field-group">
              <label class="field-label">Mot de passe</label>
              <div class="field-wrap">
                <svg
                  class="field-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  v-model="state.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  :disabled="loading"
                  class="field-input field-input-pr"
                />
                <button
                  type="button"
                  class="eye-btn"
                  @click="showPassword = !showPassword"
                >
                  <svg
                    v-if="showPassword"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <svg
                    v-else
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>

              <!-- Barre de force + critères -->
              <div v-if="state.password" class="strength-block">
                <div class="strength-bar">
                  <div
                    v-for="i in 4"
                    :key="i"
                    class="strength-segment"
                    :style="{
                      background:
                        i <= passwordStrength
                          ? strengthLabel?.color
                          : '#ede8e0',
                    }"
                  />
                </div>
                <span
                  v-if="strengthLabel"
                  class="strength-text"
                  :style="{ color: strengthLabel.color }"
                >
                  {{ strengthLabel.text }}
                </span>
                <div class="criteria-list">
                  <div
                    v-for="(ok, key) in checks"
                    :key="key"
                    class="criteria-item"
                    :class="{ ok }"
                  >
                    <svg
                      v-if="ok"
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="#059669"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <svg
                      v-else
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="4.5"
                        stroke="#c0b8ad"
                        stroke-width="1.5"
                      />
                    </svg>
                    <span>{{
                      key === "length"
                        ? "8 caractères min."
                        : key === "upper"
                          ? "Une majuscule"
                          : key === "number"
                            ? "Un chiffre"
                            : "Un caractère spécial (!@#$...)"
                    }}</span>
                  </div>
                </div>
              </div>
            </UFormField>

            <!-- Confirmer mot de passe -->
            <UFormField name="confirmPassword" class="field-group">
              <label class="field-label">Confirmer le mot de passe</label>
              <div class="field-wrap">
                <svg
                  class="field-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <input
                  v-model="state.confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="new-password"
                  :disabled="loading"
                  class="field-input field-input-pr"
                  :class="{
                    'input-ok':
                      state.confirmPassword &&
                      state.confirmPassword === state.password,
                    'input-err':
                      state.confirmPassword &&
                      state.confirmPassword !== state.password,
                  }"
                />
                <button
                  type="button"
                  class="eye-btn"
                  @click="showConfirm = !showConfirm"
                >
                  <svg
                    v-if="showConfirm"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <svg
                    v-else
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              <!-- Feedback correspondance -->
              <p
                v-if="state.confirmPassword"
                class="match-hint"
                :style="{
                  color:
                    state.confirmPassword === state.password
                      ? '#059669'
                      : '#dc2626',
                }"
              >
                {{
                  state.confirmPassword === state.password
                    ? "✓ Les mots de passe correspondent"
                    : "✗ Les mots de passe ne correspondent pas"
                }}
              </p>
            </UFormField>

            <!-- Captcha -->
            <div class="captcha-wrap">
              <div
                class="cf-turnstile"
                :data-sitekey="config.public.turnstileSiteKey"
              />
            </div>

            <!-- Submit -->
            <button type="submit" :disabled="loading" class="submit-btn">
              <template v-if="!loading">
                Créer mon compte
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </template>
              <template v-else>
                <svg class="spin-icon" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Inscription…
              </template>
            </button>
          </UForm>

          <!-- Footer carte -->
          <p class="signup-prompt">
            Déjà un compte ?
            <NuxtLink to="/auth/login" class="signup-link"
              >Se connecter</NuxtLink
            >
          </p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap");

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ── Root ── */
.auth-root {
  font-family: "Outfit", sans-serif;
  min-height: 100vh;
  background: #f5f3ef;
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
}

/* ── Background ── */
.auth-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.18;
}
.blob-1 {
  width: 500px;
  height: 500px;
  top: -120px;
  left: -100px;
  background: radial-gradient(circle, #ea6c1e, transparent 70%);
}
.blob-2 {
  width: 500px;
  height: 500px;
  bottom: -120px;
  right: -100px;
  background: radial-gradient(circle, #5b47e0, transparent 70%);
}
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(26, 22, 18, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(26, 22, 18, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Layout ── */
.auth-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  min-height: 100vh;
}
@media (max-width: 900px) {
  .auth-layout {
    grid-template-columns: 1fr;
  }
  .auth-brand {
    display: none;
  }
}

/* ── Branding ── */
.auth-brand {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
  border-right: 1px solid #e8e3da;
  background: linear-gradient(160deg, #fff 0%, #faf8f4 100%);
}
.brand-logo {
  display: inline-flex; align-items: center; gap: 10px;
  text-decoration: none;
}
.brand-name {
  font-size: 30px; font-weight: 700; letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--orange), var(--purple));
  -webkit-background-clip: text; -webkit-text-fill-color: black;
}
.brand-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 0;
}
.brand-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: black;
  margin-bottom: 16px;
}
.brand-headline {
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: #1a1612;
  margin-bottom: 16px;
}
.brand-sub {
  font-size: 14px;
  line-height: 1.65;
  color: #8a8078;
  max-width: 340px;
}

/* Étapes */
.brand-steps {
  padding: 28px 0;
  border-top: 1px solid #ede8e0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.step-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid #e8e3da;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #4a3f32;
  flex-shrink: 0;
}
.step-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1612;
}
.step-desc {
  font-size: 12px;
  color: #8a8078;
  margin-top: 1px;
}
.step-connector {
  width: 1px;
  height: 20px;
  background: #ede8e0;
  margin-left: 13px;
  margin-top: 2px;
  margin-bottom: 2px;
}

.brand-footer {
  font-size: 11px;
  color: #c0b8ad;
}

/* ── Formulaire ── */
.auth-form-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  gap: 20px;
  overflow-y: auto;
}

.form-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border: 1px solid #e8e3da;
  border-radius: 20px;
  box-shadow: 0 4px 32px rgba(26, 22, 18, 0.07);
  overflow: hidden;
}

/* En-tête */
.form-header {
  padding: 28px 28px 0;
}
.form-header-top {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}
.secure-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 99px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  font-size: 11px;
  font-weight: 500;
  color: #16a34a;
}
.secure-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse-green 2s infinite;
}
@keyframes pulse-green {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
.form-title {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #1a1612;
  margin-bottom: 6px;
}
.form-subtitle {
  font-size: 13px;
  color: #8a8078;
  line-height: 1.5;
  padding-bottom: 24px;
}

/* Sociaux */
.social-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 28px 20px;
}
.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: #faf8f5;
  border: 1px solid #e8e3da;
  border-radius: 10px;
  cursor: pointer;
  font-family: "Outfit", sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1612;
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;
}
.social-btn:hover:not(:disabled) {
  background: white;
  border-color: #c0b8ad;
  transform: translateY(-1px);
}
.social-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.social-btn-fb {
  background: #1877f2;
  border-color: #1565c0;
  color: white;
}
.social-btn-fb:hover:not(:disabled) {
  background: #1565c0;
}

/* Séparateur */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 28px 20px;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #ede8e0;
}
.divider-text {
  font-size: 11px;
  font-weight: 500;
  color: #c0b8ad;
  white-space: nowrap;
}

/* Champs */
.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 28px 24px;
}
.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #4a3f32;
  letter-spacing: 0.02em;
}

.field-wrap {
  position: relative;
}
.field-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #c0b8ad;
  pointer-events: none;
}
.field-input {
  width: 100%;
  padding: 11px 14px 11px 38px;
  background: #faf8f5;
  border: 1px solid #ede8e0;
  border-radius: 10px;
  font-family: "Outfit", sans-serif;
  font-size: 13.5px;
  color: #1a1612;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    background 0.15s;
  outline: none;
}
.field-input-pr {
  padding-right: 40px;
}
.field-input:focus {
  background: white;
  border-color: #ea6c1e;
  box-shadow: 0 0 0 3px rgba(234, 108, 30, 0.1);
}
.field-input::placeholder {
  color: #c0b8ad;
}
.field-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.input-ok {
  border-color: #059669 !important;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1) !important;
}
.input-err {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08) !important;
}

.eye-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #c0b8ad;
  padding: 2px;
  transition: color 0.15s;
}
.eye-btn:hover {
  color: #4a3f32;
}

/* Force mot de passe */
.strength-block {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.strength-bar {
  display: flex;
  gap: 4px;
}
.strength-segment {
  flex: 1;
  height: 3px;
  border-radius: 99px;
  transition: background 0.25s;
}
.strength-text {
  font-size: 11px;
  font-weight: 700;
}
.criteria-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
  margin-top: 2px;
}
.criteria-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #c0b8ad;
  transition: color 0.2s;
}
.criteria-item.ok {
  color: #4a3f32;
}

/* Match hint */
.match-hint {
  font-size: 11.5px;
  font-weight: 500;
  margin-top: 4px;
}

/* Captcha */
.captcha-wrap {
  display: flex;
  justify-content: center;
}

/* Submit */
.submit-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 20px;
  background: linear-gradient(135deg, var(--orange) 0%, var(--purple) 100%);
  border: none; border-radius: 12px; cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 14px; font-weight: 700; color: black;
  box-shadow: 0 4px 20px rgba(25, 25, 24, 0.25);
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) {
  opacity: 0.92; transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(8, 8, 8, 0.32);
}
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }


/* Footer */
.signup-prompt {
  text-align: center;
  padding: 16px 28px;
  border-top: 1px solid #ede8e0;
  background: #faf8f5;
  font-size: 12.5px;
  color: #8a8078;
}
.signup-link {
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  margin-left: 4px;
}
.signup-link:hover {
  text-decoration: underline;
}

/* Liens légaux */
.legal-links {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: #c0b8ad;
}
.legal-links a {
  color: #c0b8ad;
  text-decoration: none;
  transition: color 0.15s;
}
.legal-links a:hover {
  color: #8a8078;
}

/* Spinner */
.spin-icon {
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
