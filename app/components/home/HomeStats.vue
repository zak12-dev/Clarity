<template>
  <UDashboardPanel id="dashboard">
    <template #body>
      <div class="dashboard-body -mt-5">

        <!-- Stats -->
        <div class="stats-row">
          <UCard v-for="s in stats" :key="s.label" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" :style="{ background: s.color }">
                <UIcon :name="s.icon" />
              </div>
              <div>
                <div class="stat-value">{{ s.value }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Calendrier -->
        <ClientOnly>
          <DashboardCalendar
            :tasks="tasks ?? []"
            :statuses="statuses ?? []"
            :privileges="privileges ?? []"
            @task-click="openTask"
            class="max-w-7xl"
          />
          <template #fallback>
            <div class="cal-loading">Chargement du calendrier...</div>
          </template>
        </ClientOnly>

        <!-- Modal détail tâche -->
        <UModal v-model:open="isModalOpen">
          <template #content>
            <UCard v-if="selectedTask">
              <template #header>
                <div class="modal-header">
                  <span class="modal-title">{{ selectedTask.title }}</span>
                  <span
                    class="priority-badge"
                    :style="{
                      background: selectedTask.privilege?.color ?? '#f3f4f6',
                      color: privilegeTextColor(selectedTask.privilege?.code ?? '')
                    }"
                  >
                    {{ selectedTask.privilege?.label ?? '—' }}
                  </span>
                </div>
              </template>

              <div class="modal-body">
                <p class="modal-desc">{{ selectedTask.description || 'Pas de description.' }}</p>
                <div class="modal-meta">
                  <div class="meta-row">
                    <UIcon name="i-lucide-calendar" class="meta-icon" />
                    <span class="meta-label">Échéance</span>
                    <span class="meta-value">{{ selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'Non définie' }}</span>
                  </div>
                  <div class="meta-row">
                    <UIcon name="i-lucide-user" class="meta-icon" />
                    <span class="meta-label">Assigné à</span>
                    <span class="meta-value">{{ selectedTask.assignee?.name ?? '—' }}</span>
                  </div>
                  <div class="meta-row">
                    <UIcon name="i-lucide-user-pen" class="meta-icon" />
                    <span class="meta-label">Créé par</span>
                    <span class="meta-value">{{ selectedTask.creator?.name ?? '—' }}</span>
                  </div>
                  <div class="meta-row">
                    <UIcon name="i-lucide-tag" class="meta-icon" />
                    <span class="meta-label">Statut</span>
                    <span
                      class="status-badge"
                      :style="{
                        background: selectedTask.status?.color ?? '#e5e7eb',
                        color: statusTextColor(selectedTask.status?.code ?? '')
                      }"
                    >
                      {{ selectedTask.status?.label ?? '—' }}
                    </span>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="modal-actions">
                  <UButton icon="i-lucide-pencil" label="Modifier" variant="outline" color="primary" @click="editTask" />
                  <UButton v-if="selectedTask.status?.code !== 'done'" icon="i-lucide-check-circle" label="Terminer" color="success" @click="markDone" :loading="loadingDone" />
                  <UButton v-if="isCreator(selectedTask)" icon="i-lucide-trash-2" label="Supprimer" color="error" variant="soft" @click="confirmDelete = true" :loading="loadingDelete" />
                  <UButton icon="i-lucide-x" label="Fermer" variant="ghost" @click="isModalOpen = false" />
                </div>
              </template>
            </UCard>
          </template>
        </UModal>

        <!-- Modal confirmation suppression -->
        <UModal v-model:open="confirmDelete">
          <template #content>
            <UCard>
              <template #header>
                <span class="modal-title">Confirmer la suppression</span>
              </template>
              <p class="modal-desc">
                Voulez-vous vraiment supprimer la tâche
                <strong>« {{ selectedTask?.title }} »</strong> ?
                Cette action est irréversible.
              </p>
              <template #footer>
                <div class="modal-actions">
                  <UButton label="Annuler" variant="ghost" @click="confirmDelete = false" />
                  <UButton label="Supprimer définitivement" color="error" icon="i-lucide-trash-2" :loading="loadingDelete" @click="deleteTask" />
                </div>
              </template>
            </UCard>
          </template>
        </UModal>

      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Task } from '~/types'
import DashboardCalendar from '~/components/dashboard/Calendar.vue'

const { data: session } = await useFetch('/api/auth/me')
const currentUserId = computed(() => session.value?.user?.id ?? null)

const { data: tasks,     refresh: refreshTasks } = await useFetch<Task[]>('/api/tasks', { lazy: true, default: () => [] })
const { data: statuses  }  = await useFetch('/api/statuses',   { lazy: true, default: () => [] })
const { data: privileges } = await useFetch('/api/privileges', { lazy: true, default: () => [] })

const stats = computed(() => {
  const all = tasks.value ?? []
  const now = new Date()
  return [
    { label: 'Total tâches', value: all.length,                                                                                          icon: 'i-lucide-list-checks',  color: '#ede9fe' },
    { label: 'En cours',     value: all.filter(t => t.status?.code === 'inprogress').length,                                             icon: 'i-lucide-loader',       color: '#dbeafe' },
    { label: 'Terminées',    value: all.filter(t => t.status?.code === 'done').length,                                                   icon: 'i-lucide-check-circle', color: '#d1fae5' },
    { label: 'En retard',    value: all.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status?.code !== 'done').length,         icon: 'i-lucide-alert-circle', color: '#fee2e2' },
  ]
})

const isModalOpen  = ref(false)
const selectedTask = ref<Task | null>(null)
const loadingDone  = ref(false)
const confirmDelete = ref(false)
const loadingDelete = ref(false)

const openTask = (task: Task) => {
  selectedTask.value  = { ...task }
  isModalOpen.value   = true
  confirmDelete.value = false
}
const isCreator = (task: Task) => task.createdBy === currentUserId.value
const editTask  = () => { if (!selectedTask.value) return; isModalOpen.value = false; navigateTo(`/tasks/${selectedTask.value.id}`) }

const markDone = async () => {
  if (!selectedTask.value) return
  loadingDone.value = true
  try {
    await $fetch(`/api/tasks/${selectedTask.value.id}`, { method: 'PATCH', body: { statusCode: 'done' }, credentials: 'include' })
    await refreshTasks(); isModalOpen.value = false
  } catch (e) { console.error('Erreur markDone:', e) }
  finally { loadingDone.value = false }
}

const deleteTask = async () => {
  if (!selectedTask.value) return
  loadingDelete.value = true
  try {
    await $fetch(`/api/tasks/${selectedTask.value.id}`, { method: 'DELETE' })
    await refreshTasks(); confirmDelete.value = false; isModalOpen.value = false
  } catch (e: any) { console.error('Erreur suppression:', e?.data?.message ?? e) }
  finally { loadingDelete.value = false }
}

const statusTextColor    = (code: string) => ({ todo: '#374151', inprogress: '#1d4ed8', done: '#065f46' }[code] ?? '#374151')
const privilegeTextColor = (code: string) => ({ low: '#166534', medium: '#854d0e', high: '#991b1b' }[code] ?? '#374151')
const formatDate         = (d: string | Date) => format(new Date(d), 'dd MMM yyyy à HH:mm', { locale: fr })
</script>

<style scoped>
/* ── Layout ── */
.dashboard-body {
  padding: 1px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Stats grid ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 1024px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .stats-row { grid-template-columns: 1fr; } }

.stat-card { transition: box-shadow .2s; }
.stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }

.stat-content { display: flex; align-items: center; gap: 14px; }
.stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; flex-shrink: 0;
}
.stat-value { font-size: 1.5rem; font-weight: 700; color: var(--color-text-primary); }
.stat-label { font-size: 0.8rem;  color: var(--color-text-secondary); }

/* ── Calendrier loading ── */
.cal-loading {
  padding: 40px; text-align: center;
  color: var(--color-text-secondary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: 12px;
  background: var(--color-background-primary);
}

/* ── Modal ── */
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.modal-title  { font-size: 1.05rem; font-weight: 600; color: var(--color-text-primary); }
.modal-body   { display: flex; flex-direction: column; gap: 14px; }
.modal-desc   { font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5; }
.modal-meta   { display: flex; flex-direction: column; gap: 10px; }
.meta-row     { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; flex-wrap: wrap; }
.meta-icon    { color: var(--color-text-secondary); font-size: 14px; flex-shrink: 0; }
.meta-label   { color: var(--color-text-secondary); min-width: 80px; }
.meta-value   { color: var(--color-text-primary); font-weight: 500; }

.status-badge, .priority-badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 9999px; font-size: 0.75rem; font-weight: 500;
}
.modal-actions {
  display: flex; gap: 8px;
  justify-content: flex-end; flex-wrap: wrap;
}
@media (max-width: 480px) {
  .modal-actions { justify-content: stretch; }
  .modal-actions :deep(button) { flex: 1; justify-content: center; }
}
</style>