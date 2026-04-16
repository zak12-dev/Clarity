<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '../../../composables/useAuth'
import { onMounted, ref } from 'vue'
import { useToast } from '#imports'

const showPassword = ref(false)
const config       = useRuntimeConfig()
const toast        = useToast()
const loadingProvider = ref<string | null>(null)
const loading      = ref(false)
const route        = useRoute()

const {  loginWithEmail, fetchSession } = useAuth()

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(8, 'Doit contenir au moins 8 caractères'),
  remember: z.boolean().optional(),
})
type Schema = z.output<typeof schema>

const state = ref({ email: '', password: '', remember: false })



// ── Captcha ──
const tokenReady = ref(false)
let turnstileWidgetId: number | null = null

const refreshCaptcha = () => {
  const container = document.querySelector('.cf-turnstile')
  if ((window as any).turnstile && container) {
    if (turnstileWidgetId !== null) {
      ;(window as any).turnstile.reset(turnstileWidgetId)
    } else {
      turnstileWidgetId = (window as any).turnstile.render(container, {
        sitekey: config.public.turnstileSiteKey,
        callback: () => { tokenReady.value = true },
        'expired-callback': () => { tokenReady.value = false },
      })
    }
  }
}

// ── Submit ──
async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!tokenReady.value) {
    toast.add({ title: 'Captcha en cours', description: 'Veuillez patienter...', color: 'warning' })
    return
  }
  const token = (window as any).turnstile?.getResponse()
  if (!token) {
    toast.add({ title: 'Captcha requis', description: 'Veuillez valider le captcha.', color: 'warning' })
    return
  }

  loading.value = true
  try {
    await $fetch('/api/cloudflare/verify-turnstile', { method: 'POST', body: { token } })
    await loginWithEmail(event.data.email, event.data.password, event.data.remember)
    await fetchSession()

    toast.add({ title: 'Connexion réussie', description: 'Bienvenue !', color: 'success' })

    const redirect = route.query.redirect as string
    await navigateTo(redirect || '/')
  } catch (error: any) {
    toast.add({
      title: 'Erreur de connexion',
      description: error?.data?.message || 'Identifiants incorrects.',
      color: 'error',
    })
    refreshCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSession()
  refreshCaptcha()
})
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
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
      <span class="text-white font-bold text-sm">C</span>
    </div>

          <span class="brand-name">Clarity</span>
        </NuxtLink>

        <div class="brand-content">
          <p class="brand-eyebrow">Plateforme de gestion</p>
          <h2 class="brand-headline">Gérez vos taches<br/>sans friction.</h2>
          <p class="brand-sub">Un espace centralisé pour piloter vos tâches et votre équipe </p>
        </div>

        <div class="brand-features">
          <div class="feature-item">
            <div class="feature-dot bg-gray-700"  />
            <span>Gestion des tâches en temps réel</span>
          </div>
          <div class="feature-item">
            <div class="feature-dot bg-gray-700"  />
            <span>Calendrier collaboratif intégré</span>
          </div>
          
        </div>

        <p class="brand-footer">© 2026 Clarity — Tous droits réservés</p>
      </aside>

      <!-- ── Colonne droite — formulaire ── -->
      <main class="auth-form-col">
        <div class="form-card">

          <!-- En-tête -->
          <div class="form-header">
            <div class="form-header-top">
              <div class="secure-badge">
                <span class="secure-dot" />
                Connexion sécurisée
              </div>
            </div>
            <h1 class="form-title">Bienvenue de retour</h1>
            <p class="form-subtitle">Connectez-vous pour accéder à votre espace.</p>
          </div>

          

          <!-- Formulaire -->
          <UForm :schema="schema" :state="state" validate-on="input" @submit="onSubmit" class="form-fields">

            <!-- Email -->
            <UFormField name="email" class="field-group">
              <label class="field-label">Adresse email</label>
              <div class="field-wrap">
                <svg class="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  v-model="state.email"
                  type="email"
                  placeholder="votre@email.com"
                  autocomplete="email"
                  autofocus
                  :disabled="loading"
                  class="field-input"
                  @focus="refreshCaptcha"
                />
              </div>
            </UFormField>

            <!-- Mot de passe -->
            <UFormField name="password" class="field-group">
              <div class="field-label-row">
                <label class="field-label">Mot de passe</label>
                <NuxtLink to="/auth/forgot" class="forgot-link">Mot de passe oublié ?</NuxtLink>
              </div>
              <div class="field-wrap">
                <svg class="field-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
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
                  <svg v-if="showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </UFormField>

            <!-- Se souvenir 
            <label class="remember-row">
              <div class="custom-checkbox">
                <input v-model="state.remember" type="checkbox" class="sr-only" />
                <div class="checkbox-box" :class="{ checked: state.remember }">
                  <svg v-if="state.remember" width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>
              <span class="remember-label">Se souvenir de moi pendant 30 jours</span>
            </label>-->

            <!-- Captcha -->
            <div class="captcha-wrap">
              <div class="cf-turnstile" :data-sitekey="config.public.turnstileSiteKey" />
            </div>

            <!-- Bouton submit -->
            <button type="submit" :disabled="loading" class="submit-btn">
              <template v-if="!loading">
                Se connecter
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </template>
              <template v-else>
                <svg class="spin-icon" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Connexion en cours…
              </template>
            </button>

          </UForm>

          <!-- Footer carte -->
          <p class="signup-prompt">
            Pas encore de compte ?
            <NuxtLink to="/auth/signup" class="signup-link">Créer un compte</NuxtLink>
          </p>

        </div>

        <!-- Liens légaux 
        <nav class="legal-links">
          <NuxtLink to="/helps/faq">Confidentialité</NuxtLink>
          <span>·</span>
          <NuxtLink to="/helps/terms">Conditions</NuxtLink>
          <span>·</span>
          <NuxtLink to="/contact">Aide</NuxtLink>
        </nav>-->
      </main>

    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

/* ── Variables ───────────────────────────────────────────── */
:root {
  --orange:  #ea6c1e;
  --purple:  #5b47e0;
  --bg:      #f5f3ef;
  --surface: #ffffff;
  --border:  #e8e3da;
  --muted:   #ede8e0;
  --text:    #1a1612;
  --sub:     #8a8078;
  --light:   #c0b8ad;
}

/* ── Reset & base ────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.auth-root {
  font-family: 'Outfit', sans-serif;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
}

/* ── Background ──────────────────────────────────────────── */
.auth-bg {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
}
.blob {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.18;
}
.blob-1 {
  width: 500px; height: 500px; top: -120px; left: -100px;
  background: radial-gradient(circle, #ea6c1e, transparent 70%);
}
.blob-2 {
  width: 500px; height: 500px; bottom: -120px; right: -100px;
  background: radial-gradient(circle, #5b47e0, transparent 70%);
}
.grid-overlay {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(26,22,18,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(26,22,18,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* ── Layout deux colonnes ────────────────────────────────── */
.auth-layout {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%; min-height: 100vh;
}

@media (max-width: 900px) {
  .auth-layout { grid-template-columns: 1fr; }
  .auth-brand  { display: none; }
}

/* ── Colonne gauche — branding ───────────────────────────── */
.auth-brand {
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 48px;
  border-right: 1px solid var(--border);
  background: linear-gradient(160deg, #fff 0%, #faf8f4 100%);
}

.brand-logo {
  display: inline-flex; align-items: center; gap: 10px;
  text-decoration: none;
}
.logo-svg { flex-shrink: 0; }
.brand-name {
  font-size: 30px; font-weight: 700; letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--orange), var(--purple));
  -webkit-background-clip: text; -webkit-text-fill-color: black;
}

.brand-content { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 48px 0; }
.brand-eyebrow {
  font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--orange);
  margin-bottom: 16px;
}
.brand-headline {
  font-size: clamp(28px, 3vw, 38px); font-weight: 800;
  line-height: 1.15; letter-spacing: -0.03em;
  color: var(--text); margin-bottom: 16px;
}
.brand-sub {
  font-size: 14px; line-height: 1.65; color: var(--sub); max-width: 340px;
}

.brand-features {
  display: flex; flex-direction: column; gap: 12px;
  padding: 28px 0;
  border-top: 1px solid var(--muted);
}
.feature-item {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #4a3f32; font-weight: 500;
}
.feature-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.brand-footer {
  font-size: 11px; color: var(--light);
}

/* ── Colonne droite — formulaire ─────────────────────────── */
.auth-form-col {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 48px 32px;
  gap: 20px;
}

/* ── Card formulaire ─────────────────────────────────────── */
.form-card {
  width: 100%; max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 4px 32px rgba(26, 22, 18, 0.07);
  overflow: hidden;
}

/* En-tête */
.form-header {
  padding: 28px 28px 0;
}
.form-header-top {
  display: flex; justify-content: flex-end; margin-bottom: 20px;
}
.secure-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 99px;
  background: #f0fdf4; border: 1px solid #bbf7d0;
  font-size: 11px; font-weight: 500; color: #16a34a;
}
.secure-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
  animation: pulse-green 2s infinite;
}
@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.form-title {
  font-size: 22px; font-weight: 800; letter-spacing: -0.03em;
  color: var(--text); margin-bottom: 6px;
}
.form-subtitle {
  font-size: 13px; color: var(--sub); line-height: 1.5;
  padding-bottom: 24px;
}

/* Sociaux */
.social-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  padding: 0 28px 20px;
}
.social-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 16px;
  background: #faf8f5; border: 1px solid var(--border);
  border-radius: 10px; cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 13px; font-weight: 600; color: var(--text);
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.social-btn:hover:not(:disabled) {
  background: white; border-color: var(--light); transform: translateY(-1px);
}
.social-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.social-btn-fb {
  background: #1877F2; border-color: #1565C0;
  color: white;
}
.social-btn-fb:hover:not(:disabled) { background: #1565C0; border-color: #1044a3; }

/* Séparateur */
.divider {
  display: flex; align-items: center; gap: 12px;
  padding: 0 28px 20px;
}
.divider-line { flex: 1; height: 1px; background: var(--muted); }
.divider-text { font-size: 11px; font-weight: 500; color: var(--light); white-space: nowrap; }

/* Champs */
.form-fields {
  display: flex; flex-direction: column; gap: 16px;
  padding: 0 28px 24px;
}
.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px; font-weight: 600; color: #4a3f32; letter-spacing: 0.02em;
}
.field-label-row {
  display: flex; align-items: center; justify-content: space-between;
}
.forgot-link {
  font-size: 11.5px; font-weight: 500; color: var(--orange); text-decoration: none;
}
.forgot-link:hover { text-decoration: underline; }

.field-wrap { position: relative; }
.field-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  color: var(--light); pointer-events: none;
}
.field-input {
  width: 100%; padding: 11px 14px 11px 38px;
  background: #faf8f5; border: 1px solid var(--border);
  border-radius: 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 13.5px; color: var(--text);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  outline: none;
}
.field-input-pr { padding-right: 40px; }
.field-input:focus {
  background: white;
  border-color: var(--orange);
  box-shadow: 0 0 0 3px rgba(234, 108, 30, 0.1);
}
.field-input::placeholder { color: var(--light); }
.field-input:disabled { opacity: 0.55; cursor: not-allowed; }

.eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--light); padding: 2px;
  transition: color 0.15s;
}
.eye-btn:hover { color: #4a3f32; }

/* Se souvenir */
.remember-row {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
}
.custom-checkbox { position: relative; }
.checkbox-box {
  width: 16px; height: 16px; border-radius: 4px;
  border: 1.5px solid var(--border); background: #faf8f5;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}
.checkbox-box.checked { background: var(--orange); border-color: var(--orange); }
.remember-label { font-size: 12.5px; color: var(--sub); }

/* Captcha */
.captcha-wrap { display: flex; justify-content: center; }

/* Bouton submit */
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

/* Footer carte */
.signup-prompt {
  text-align: center;
  padding: 16px 28px;
  border-top: 1px solid var(--muted);
  background: #faf8f5;
  font-size: 12.5px; color: var(--sub);
}
.signup-link {
  font-weight: 700;
  color: green;
  text-decoration: none;
  margin-left: 4px;
}
.signup-link:hover {
  text-decoration: underline;
}

/* Liens légaux */
.legal-links {
  display: flex; align-items: center; gap: 12px;
  font-size: 11px; color: var(--light);
}
.legal-links a { color: var(--light); text-decoration: none; transition: color 0.15s; }
.legal-links a:hover { color: var(--sub); }

/* Spinner */
.spin-icon { width: 16px; height: 16px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>