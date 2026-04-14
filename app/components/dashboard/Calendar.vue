<template>
  <div class="calendar-wrapper">

    <!-- Toolbar : navigation + switch vue -->
    <div class="cal-toolbar">
      <div class="cal-nav">
        <UButton icon="i-lucide-chevron-left"  variant="ghost" @click="prev" />
        <span class="cal-title">{{ currentLabel }}</span>
        <UButton icon="i-lucide-chevron-right" variant="ghost" @click="next" />
        <UButton label="Aujourd'hui" variant="soft" size="sm" @click="goToday" />
      </div>

      <div class="cal-view-switch">
        <UButton
          label="Semaine"
          :variant="view === 'week' ? 'solid' : 'ghost'"
          size="sm"
          @click="view = 'week'"
        />
        <UButton
          label="Mois"
          :variant="view === 'month' ? 'solid' : 'ghost'"
          size="sm"
          @click="view = 'month'"
        />
      </div>
    </div>

    <!-- En-tête jours -->
    <div class="cal-grid" :style="gridStyle">
      <div
        v-for="day in displayedDays"
        :key="day.key"
        class="cal-day-header"
        :class="{ today: day.isToday }"
      >
        <span class="day-name">{{ day.name }}</span>
        <span class="day-number" :class="{ 'today-badge': day.isToday }">
          {{ day.number }}
        </span>
      </div>
    </div>

    <!-- Cellules des tâches -->
    <div class="cal-body-grid" :style="gridStyle">
      <div
        v-for="day in displayedDays"
        :key="'body-' + day.key"
        class="cal-day-cell"
        :class="{
          'other-month': !day.currentMonth,
          'today-col': day.isToday
        }"
      >
        <DashboardTaskCard
          v-for="task in getTasksForDay(day.date)"
          :key="task.id"
          :task="task"
          @click="$emit('task-click', task)"
        />
        <div v-if="getTasksForDay(day.date).length === 0" class="empty-day" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks,
  format, isToday
} from 'date-fns'
import { fr } from 'date-fns/locale'
import DashboardTaskCard from './TaskCard.vue'

interface Task {
  id: number
  title: string
  status: string
  priority: string
  dueDate?: string | Date
}

const props = defineProps<{ tasks: Task[] }>()
defineEmits(['task-click'])

const view = ref<'week' | 'month'>('month')
const cursor = ref(new Date())

// Navigation
const prev = () => {
  cursor.value = view.value === 'month'
    ? subMonths(cursor.value, 1)
    : subWeeks(cursor.value, 1)
}
const next = () => {
  cursor.value = view.value === 'month'
    ? addMonths(cursor.value, 1)
    : addWeeks(cursor.value, 1)
}
const goToday = () => { cursor.value = new Date() }

// Label en-tête
const currentLabel = computed(() =>
  view.value === 'month'
    ? format(cursor.value, 'MMMM yyyy', { locale: fr })
    : `Semaine du ${format(startOfWeek(cursor.value, { locale: fr }), 'd MMM', { locale: fr })}`
)

// Jours à afficher
const displayedDays = computed(() => {
  let days: Date[]
  if (view.value === 'month') {
    const start = startOfWeek(startOfMonth(cursor.value), { locale: fr })
    const end   = endOfWeek(endOfMonth(cursor.value),   { locale: fr })
    days = eachDayOfInterval({ start, end })
  } else {
    const start = startOfWeek(cursor.value, { locale: fr })
    const end   = endOfWeek(cursor.value,   { locale: fr })
    days = eachDayOfInterval({ start, end })
  }

  return days.map(d => ({
    date:         d,
    key:          format(d, 'yyyy-MM-dd'),
    name:         format(d, 'EEE', { locale: fr }),
    number:       format(d, 'd'),
    isToday:      isToday(d),
    currentMonth: isSameMonth(d, cursor.value),
  }))
})

// Grille CSS dynamique (7 colonnes semaine, 7 colonnes mois)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(7, 1fr)`
}))

// Tâches par jour
const getTasksForDay = (date: Date) =>
  props.tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date))
</script>

<style scoped>
.calendar-wrapper {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

/* Toolbar */
.cal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}
.cal-nav { display: flex; align-items: center; gap: 8px; }
.cal-title { font-size: 1.1rem; font-weight: 700; color: #111827; min-width: 180px; text-align: center; text-transform: capitalize; }
.cal-view-switch { display: flex; gap: 4px; }

/* Grille en-tête */
.cal-grid {
  display: grid;
  border-bottom: 1px solid #e5e7eb;
}
.cal-day-header {
  padding: 8px 4px;
  text-align: center;
  border-right: 1px solid #f3f4f6;
  background: #f9fafb;
}
.cal-day-header:last-child { border-right: none; }
.day-name   { display: block; font-size: 0.7rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
.day-number { display: inline-block; font-size: 0.95rem; font-weight: 600; color: #374151; padding: 2px 6px; border-radius: 9999px; }
.today-badge { background: #4f46e5; color: white; }

/* Grille corps */
.cal-body-grid {
  display: grid;
  min-height: 480px;
}
.cal-day-cell {
  padding: 6px 4px;
  border-right: 1px solid #f3f4f6;
  border-bottom: 1px solid #f3f4f6;
  min-height: 80px;
  vertical-align: top;
}
.cal-day-cell:last-child { border-right: none; }
.other-month { background: #fafafa; opacity: 0.6; }
.today-col   { background: #eef2ff; }
.empty-day   { min-height: 40px; }
</style>