<template>
  <UDashboardPanel :id="isEdit ? 'edit-task' : 'create-task'" class="max-w-7xl">
    <template #header>
      <UDashboardNavbar :title="isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'">
        <template #leading>
          <UButton icon="i-lucide-arrow-left" variant="ghost" @click="navigateTo('/')" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto w-full max-w-7xl px-4">
        <div class="form-wrap">
          <UCard class="form-card">
            <div class="form-grid">

              <!-- Titre -->
              <div class="field full">
                <label class="field-label">Titre <span class="required">*</span></label>
                <UInput v-model="form.title" placeholder="Ex : Préparer le rapport mensuel" :color="errors.title ? 'error' : undefined" />
                <p v-if="errors.title" class="field-error">{{ errors.title }}</p>
              </div>

              <!-- Description -->
              <div class="field full">
                <label class="field-label">Description</label>
                <UTextarea v-model="form.description" placeholder="Décrivez la tâche en détail..." :rows="4" />
              </div>

              <!-- Statut -->
              <div class="field">
                <label class="field-label">Statut <span class="required">*</span></label>
                <USelectMenu v-model="form.statusId" :items="statusOptions" placeholder="Choisir un statut" :color="errors.statusId ? 'error' : undefined" option-attribute="label" value-attribute="value" by-value />
                <p v-if="errors.statusId" class="field-error">{{ errors.statusId }}</p>
              </div>

              <!-- Priorité -->
              <div class="field">
                <label class="field-label">Priorité <span class="required">*</span></label>
                <USelectMenu v-model="form.privilegeId" :items="privilegeOptions" placeholder="Choisir une priorité" :color="errors.privilegeId ? 'error' : undefined" option-attribute="label" value-attribute="value" by-value />
                <p v-if="errors.privilegeId" class="field-error">{{ errors.privilegeId }}</p>
              </div>

              <!-- Date d'échéance -->
              <div class="field">
                <label class="field-label">Date d'échéance</label>
                <UInput v-model="form.dueDate" type="datetime-local" />
              </div>

              <!-- ✅ Assigné à — visible pour tous, chargé depuis l'API -->
              <div class="field" v-if="canAssign">
                <label class="field-label">Assigner à</label>
                <USelectMenu
                  v-model="form.assignedTo"
                  :items="userOptions"
                  placeholder="Choisir un utilisateur"
                  option-attribute="label"
                  value-attribute="value"
                  by-value
                  :loading="usersPending"
                />
              </div>

            </div>

            <!-- Actions -->
            <div class="form-actions">
              <UButton label="Annuler" variant="ghost" @click="navigateTo('/')" />
              <UButton
                :label="isEdit ? 'Enregistrer les modifications' : 'Créer la tâche'"
                :icon="isEdit ? 'i-lucide-save' : 'i-lucide-plus'"
                :loading="loading"
                @click="submit"
              />
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import type { Status, Privilege } from '~/types'
import { useAuth } from '~~/composables/useAuth'
definePageMeta({ layout: 'dashboard' })

// ── Route ─────────────────────────────────────────────────
const route  = useRoute()
const taskId = computed(() => route.params.id === 'new' ? null : Number(route.params.id))
const isEdit = computed(() => taskId.value !== null && !isNaN(taskId.value))

// ── Auth ─────────────────────────────────────────────────
const { user } = useAuth()

const canAssign = computed(() =>
  ['super_admin', 'admin', 'manager'].includes(user.value?.role?.code ?? '')
)

// ── Data distante ──────────────────────────────────────────
const { data: statuses   } = await useFetch<Status[]>('/api/statuses',    { default: () => [] })
const { data: privileges } = await useFetch<Privilege[]>('/api/privileges', { default: () => [] })

// ✅ Fetch utilisateurs — toujours chargé, affiché pour tous
const { data: usersData, pending: usersPending } = await useFetch<{ id: string; name: string }[]>('/api/users', {
  default: () => []
})

// ── Options select ─────────────────────────────────────────
const statusOptions = computed(() =>
  (statuses.value ?? []).map(s => ({ label: s.label, value: Number(s.id) }))
)
const privilegeOptions = computed(() =>
  (privileges.value ?? []).map(p => ({ label: p.label, value: Number(p.id) }))
)
const userOptions = computed(() => [
  { label: '— Aucun —', value: null },
  ...(usersData.value ?? []).map(u => ({ label: u.name, value: u.id }))
])

// ── Formulaire ─────────────────────────────────────────────
const form = reactive({
  title:       '',
  description: '',
  statusId:    null as number | null,
  privilegeId: null as number | null,
  dueDate:     '',
  assignedTo:  null as string | null,
})

const errors  = reactive({ title: '', statusId: '', privilegeId: '' })
const loading = ref(false)

// ── Préremplissage si mode édition ────────────────────────
if (isEdit.value) {
  const { data: task } = await useFetch(`/api/tasks/${taskId.value}`)
  if (task.value) {
    form.title       = task.value.title
    form.description = task.value.description ?? ''
    form.statusId    = task.value.statusId
    form.privilegeId = task.value.privilegeId
    form.assignedTo  = task.value.assignedTo ?? null
    form.dueDate     = task.value.dueDate
      ? new Date(task.value.dueDate).toISOString().slice(0, 16)
      : ''
  }
}

// ── Validation ─────────────────────────────────────────────
const validate = () => {
  errors.title       = form.title.trim()  ? '' : 'Le titre est obligatoire'
  errors.statusId    = form.statusId      ? '' : 'Le statut est obligatoire'
  errors.privilegeId = form.privilegeId   ? '' : 'La priorité est obligatoire'
  return !errors.title && !errors.statusId && !errors.privilegeId
}

// ── Soumission ─────────────────────────────────────────────
const submit = async () => {
  if (!validate()) return
  loading.value = true

  const body = {
    title:       form.title.trim(),
    description: form.description.trim() || null,
    statusId:    form.statusId,
    privilegeId: form.privilegeId,
    dueDate:     form.dueDate ? new Date(form.dueDate).toISOString() : null,
    assignedTo:  form.assignedTo || null,
  }

  try {
    if (isEdit.value) {
      await $fetch(`/api/tasks/${taskId.value}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/tasks', { method: 'POST', body })
    }
    await navigateTo('/')
  } catch (e: any) {
    console.error('Erreur soumission:', e?.data?.message ?? e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-wrap { margin: 0 auto; width: 100%; }
.form-card { padding: 8px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.full { grid-column: 1 / -1; }
.field-label { font-size: 0.875rem; font-weight: 500; color: #374151; }
.required { color: #ef4444; }
.field-error { font-size: 0.75rem; color: #ef4444; margin-top: 2px; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 16px; border-top: 1px solid #f3f4f6; }
</style>