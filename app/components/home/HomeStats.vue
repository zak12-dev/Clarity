<template>
  <UDashboardPanel id="dashboard">
  
    <template #body>
      <div class="dashboard-body">

        <!-- Stats -->
        <div class="stats-row">
          <UCard v-for="s in stats" :key="s.label" class="stat-card">
            <div class="stat-icon" :style="{ background: s.color }">
              <UIcon :name="s.icon" />
            </div>
            <div>
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </div>
          </UCard>
        </div>

        <!-- Filtres -->
        <div class="filters-row">
          <USelectMenu
            v-model="filterStatus"
            :options="statusOptions"
            placeholder="Statut"
            class="w-40"
          />
          <USelectMenu
            v-model="filterPriority"
            :options="priorityOptions"
            placeholder="Priorité"
            class="w-40"
          />
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Rechercher une tâche..."
            class="w-64"
          />
        </div>

        <!-- Calendrier -->
        <DashboardCalendar
          :tasks="filteredTasks"
          @task-click="openTask"
        />

        <!-- Modal détail tâche -->
        <UModal v-model="isModalOpen">
          <UCard v-if="selectedTask">
            <template #header>
              <div class="modal-header">
                <span class="modal-title">{{ selectedTask.title }}</span>
                <span :class="priorityBadge(selectedTask.priority)">
                  {{ priorityLabel(selectedTask.priority) }}
                </span>
              </div>
            </template>
            <p class="text-gray-600 mb-3">{{ selectedTask.description || 'Pas de description.' }}</p>
            <div class="modal-meta">
              <span>📅 Échéance : {{ selectedTask.dueDate ? formatDate(selectedTask.dueDate) : 'Non définie' }}</span>
              <span>👤 Assigné à : {{ selectedTask.assignee?.name ?? '—' }}</span>
              <span>📌 Statut : {{ statusLabel(selectedTask.status) }}</span>
            </div>
          </UCard>
        </UModal>

      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Task } from '~/types'
import DashboardCalendar from '@/components/dashboard/Calendar.vue'

// ─── Data ───────────────────────────────────────────────
const { data: tasks, refresh } = await useFetch<Task[]>('/api/tasks')

// ─── Stats ──────────────────────────────────────────────
const stats = computed(() => {
  const all      = tasks.value ?? []
  const now      = new Date()
  return [
    { label: 'Total tâches',    value: all.length,
      icon: 'i-lucide-list-checks', color: '#ede9fe' },
    { label: 'En cours',        value: all.filter(t => t.status === 'inprogress').length,
      icon: 'i-lucide-loader',      color: '#dbeafe' },
    { label: 'Terminées',       value: all.filter(t => t.status === 'done').length,
      icon: 'i-lucide-check-circle',color: '#d1fae5' },
    { label: 'En retard',       value: all.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'done').length,
      icon: 'i-lucide-alert-circle', color: '#fee2e2' },
  ]
})

// ─── Filtres ─────────────────────────────────────────────
const search         = ref('')
const filterStatus   = ref(null)
const filterPriority = ref(null)

const statusOptions   = [
  { label: 'Tous les statuts', value: null },
  { label: 'À faire',          value: 'todo' },
  { label: 'En cours',         value: 'inprogress' },
  { label: 'Terminé',          value: 'done' },
]
const priorityOptions = [
  { label: 'Toutes priorités', value: null },
  { label: 'Basse',            value: 'low' },
  { label: 'Moyenne',          value: 'medium' },
  { label: 'Haute',            value: 'high' },
]

const filteredTasks = computed(() =>
  (tasks.value ?? []).filter((t: Task) => {
    const matchSearch   = !search.value || t.title.toLowerCase().includes(search.value.toLowerCase())
    const matchStatus   = !filterStatus.value   || t.status   === filterStatus.value
    const matchPriority = !filterPriority.value || t.priority === filterPriority.value
    return matchSearch && matchStatus && matchPriority
  })
)

// ─── Modal ───────────────────────────────────────────────
const isModalOpen  = ref(false)
const selectedTask = ref<Task | null>(null)

const openTask = (task: Task) => {
  selectedTask.value = task
  isModalOpen.value  = true
}

// ─── Helpers ─────────────────────────────────────────────
const formatDate = (d: string | Date) => format(new Date(d), 'dd MMM yyyy à HH:mm', { locale: fr })

const statusLabels: Record<string, string> = { todo: 'À faire', inprogress: 'En cours', done: 'Terminé' }
const priorityLabels: Record<string, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }

const statusLabel = (s: string) => statusLabels[s] ?? s
const priorityLabel = (p: string) => priorityLabels[p] ?? p
const priorityBadge = (p: string) => ({
  'badge-low':    p === 'low',
  'badge-medium': p === 'medium',
  'badge-high':   p === 'high',
  'priority-badge': true,
})
</script>

<style scoped>
.dashboard-body { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card :deep(.card-body) { display: flex; align-items: center; gap: 14px; }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.stat-value { font-size: 1.5rem; font-weight: 700; color: #111827; }
.stat-label { font-size: 0.8rem; color: #6b7280; }

.filters-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }

.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-title  { font-size: 1.1rem; font-weight: 700; }
.modal-meta   { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: #374151; }

.priority-badge { padding: 2px 10px; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
.badge-low    { background: #dcfce7; color: #166534; }
.badge-medium { background: #fef9c3; color: #854d0e; }
.badge-high   { background: #fee2e2; color: #991b1b; }
</style>