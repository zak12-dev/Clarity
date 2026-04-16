<template>
  <div
    class="task-card"
    :class="priorityClass"
    @click="$emit('click', task)"
  >
    <div class="task-time" v-if="task.dueDate">
      {{ formatTime(task.dueDate) }}
    </div>
    <div class="task-title">{{ task.title }}</div>
    <div class="task-status">
      <span :class="statusBadgeClass">{{ statusLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Task {
  id: number
  title: string
  status: string      // 'todo' | 'inprogress' | 'done'
  priority: string    // 'low' | 'medium' | 'high'
  dueDate?: string | Date
}

const props = defineProps<{ task: Task }>()
defineEmits(['click'])

const formatTime = (date: string | Date) =>
  format(new Date(date), 'HH:mm', { locale: fr })

const priorityClass = computed(() => ({
  'priority-low':    props.task.priority === 'low',
  'priority-medium': props.task.priority === 'medium',
  'priority-high':   props.task.priority === 'high',
}))

const statusLabel = computed(() => ({
  todo:       'À faire',
  inprogress: 'En cours',
  done:       'Terminé',
}[props.task.status] ?? props.task.status))

const statusBadgeClass = computed(() => ({
  'badge-todo':       props.task.status === 'todo',
  'badge-inprogress': props.task.status === 'inprogress',
  'badge-done':       props.task.status === 'done',
}))
</script>

<style scoped>
.task-card {
  border-radius: 8px;
  padding: 6px 8px;
  margin-bottom: 4px;
  cursor: pointer;
  font-size: 0.78rem;
  border-left: 4px solid transparent;
  transition: opacity 0.2s;
}
.task-card:hover { opacity: 0.85; }

/* Priorité → couleur de fond */
.priority-low    { background: #dcfce7; border-left-color: #22c55e; }
.priority-medium { background: #fef9c3; border-left-color: #eab308; }
.priority-high   { background: #fee2e2; border-left-color: #ef4444; }

.task-time  { color: #6b7280; font-size: 0.7rem; margin-bottom: 2px; }
.task-title { font-weight: 600; color: #1f2937; line-height: 1.2; }
.task-status { margin-top: 4px; }

/* Badges statut */
.badge-todo, .badge-inprogress, .badge-done {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 500;
}
.badge-todo       { background: #e5e7eb; color: #374151; }
.badge-inprogress { background: #dbeafe; color: #1d4ed8; }
.badge-done       { background: #d1fae5; color: #065f46; }
</style>