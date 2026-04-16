<template>
  <div class="cal-wrap">
    <!-- Toolbar -->
    <div class="cal-toolbar">
      <div class="cal-nav">
        <UButton
          icon="i-lucide-chevron-left"
          variant="ghost"
          size="sm"
          @click="move(-1)"
        />
        <span class="cal-title">{{ currentLabel }}</span>
        <UButton
          icon="i-lucide-chevron-right"
          variant="ghost"
          size="sm"
          @click="move(1)"
        />
        <UButton
          label="Aujourd'hui"
          variant="soft"
          size="sm"
          @click="goToday"
        />
      </div>
      <div class="cal-view-switch">
        <UButton
          label="Mois"
          :variant="view === 'month' ? 'solid' : 'ghost'"
          size="sm"
          @click="view = 'month'"
        />
        <UButton
          label="Semaine"
          :variant="view === 'week' ? 'solid' : 'ghost'"
          size="sm"
          @click="view = 'week'"
        />
      </div>
    </div>

    <!-- Filtres -->
    <div class="cal-filters">
      <!-- Statut dynamique depuis l'API -->
      <USelectMenu
        v-model="fStatus"
        :items="statusOpts"
        optionAttribute="label"
        valueAttribute="value"
        placeholder="Statut"
      />

      <USelectMenu
        v-model="fPriority"
        :items="priorityOpts"
        optionAttribute="label"
        valueAttribute="value"
        placeholder="Priorité"
        class="w-40"
        :loading="privilegePending"
      />

      <USelectMenu
        v-model="fUser"
        :items="userOpts"
        optionAttribute="label"
        valueAttribute="value"
        placeholder="Utilisateur"
        class="w-44"
      />
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Rechercher..."
        class="w-56"
      />
    </div>

    <!-- Légende dynamique des priorités -->
   <div class="cal-legend">
  <span
    v-for="priv in privileges"
    :key="priv.id"
    class="legend-item"
    :style="{
      background: hexToRgba(priv.color, 0.12),
      border: `1px solid ${hexToRgba(priv.color, 0.25)}`,
      color: '#374151',
    }"
  >
    <span
      class="legend-dot"
      :style="{ background: priv.color ?? '#9ca3af' }"
    />
    {{ priv.label }}
  </span>
</div>

    <!-- En-tête jours -->
    <div class="cal-grid cal-head">
      <div v-for="d in DAY_NAMES" :key="d" class="head-cell">{{ d }}</div>
    </div>

    <!-- Grille des jours -->
    <div
      class="cal-grid cal-body"
      :style="{
        gridTemplateRows: `repeat(${Math.ceil(displayedDays.length / 7)}, minmax(100px,1fr))`,
      }"
    >
      <div
        v-for="day in displayedDays"
        :key="day.key"
        class="day-cell"
        :class="{ 'other-month': !day.currentMonth, today: day.isToday }"
      >
        <span class="day-num" :class="{ 'today-badge': day.isToday }">{{
          day.number
        }}</span>

        <!-- Tâches du jour -->
        <div
          v-for="task in getTasksForDay(day.date).slice(
            0,
            view === 'month' ? 5 : 99,
          )"
          :key="task.id"
          class="task-pill"
          :style="pillStyle(task)"
          @click="emit('task-click', task)"
          :title="task.title"
        >
          <div class="pill-time">{{ formatTime(task.dueDate) }}</div>
          <div class="pill-title">{{ task.title }}</div>
          <div
  class="pill-status"
  :style="{ color: '#6b7280' }"
>
  {{ task.status?.label ?? '' }}
</div>
        </div>

        <!-- +N autres -->
        <div
          v-if="view === 'month' && getTasksForDay(day.date).length > 5"
          class="more-tasks"
        >
          +{{ getTasksForDay(day.date).length - 5 }} autre{{
            getTasksForDay(day.date).length - 5 > 1 ? "s" : ""
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  isToday,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Task, Status, Privilege } from "~/types";

const props = defineProps<{ tasks: Task[] }>();
const emit = defineEmits<{ "task-click": [task: Task] }>();

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ─── Fetch statuts & privilèges depuis les APIs ───────────────────────────────
const { data: statusData, pending: statusPending } =
  await useFetch<Status[]>("/api/statuses");
const { data: privilegeData, pending: privilegePending } =
  await useFetch<Privilege[]>("/api/privileges");

const statuses = computed(() => statusData.value ?? []);
const privileges = computed(() => privilegeData.value ?? []);

// ─── Options des filtres (générées depuis les APIs) ───────────────────────────
const statusOpts = computed(() => [
  { label: "Tous les statuts", value: null },
  ...statuses.value.map((s) => ({
    label: s.label,
    value: s.id,
  })),
]);

const priorityOpts = computed(() => [
  { label: "Toutes priorités", value: null },
  ...privileges.value.map((p) => ({
    label: p.label,
    value: p.id,
  })),
]);

const userOpts = computed(() => {
  const names = [
    ...new Set(props.tasks.map((t) => t.assignee?.name).filter(Boolean)),
  ];
  return [
    { label: "Tous les utilisateurs", value: null },
    ...names.map((n) => ({ label: n, value: n })),
  ];
});

// ─── État des filtres ─────────────────────────────────────────────────────────
const view = ref<"month" | "week">("month");
const cursor = ref(new Date());
const fStatus = ref<{ label: string; value: number | null } | null>(null)
const fPriority = ref<{ label: string; value: number | null } | null>(null)
const fUser = ref<{ label: string; value: string | null } | null>(null)
const search = ref("");

// ─── Filtrage des tâches ──────────────────────────────────────────────────────
const filteredTasks = computed(() =>
  props.tasks.filter((t) => {
    const statusValue = fStatus.value?.value
    const priorityValue = fPriority.value?.value
    const userValue = fUser.value?.value

    return (
      (!statusValue || t.statusId === statusValue) &&
      (!priorityValue || t.privilegeId === priorityValue) &&
      (!userValue || t.assignee?.name === userValue) &&
      (!search.value ||
        t.title.toLowerCase().includes(search.value.toLowerCase()))
    )
  })
)

// ─── Navigation ───────────────────────────────────────────────────────────────
const move = (dir: number) => {
  cursor.value =
    view.value === "month"
      ? dir > 0
        ? addMonths(cursor.value, 1)
        : subMonths(cursor.value, 1)
      : dir > 0
        ? addWeeks(cursor.value, 1)
        : subWeeks(cursor.value, 1);
};
const goToday = () => {
  cursor.value = new Date();
};

const currentLabel = computed(() =>
  view.value === "month"
    ? format(cursor.value, "MMMM yyyy", { locale: fr })
    : `Semaine du ${format(startOfWeek(cursor.value, { locale: fr }), "d MMM", { locale: fr })}`,
);

// ─── Jours affichés ───────────────────────────────────────────────────────────
const displayedDays = computed(() => {
  const days =
    view.value === "month"
      ? eachDayOfInterval({
          start: startOfWeek(startOfMonth(cursor.value), { locale: fr }),
          end: endOfWeek(endOfMonth(cursor.value), { locale: fr }),
        })
      : eachDayOfInterval({
          start: startOfWeek(cursor.value, { locale: fr }),
          end: endOfWeek(cursor.value, { locale: fr }),
        });

  return days.map((d) => ({
    date: d,
    key: format(d, "yyyy-MM-dd"),
    number: format(d, "d"),
    isToday: isToday(d),
    currentMonth: isSameMonth(d, cursor.value),
  }));
});

// ─── Tâches par jour ─────────────────────────────────────────────────────────
const getTasksForDay = (date: Date) => {
  const dayStart = startOfDay(date).getTime();
  return filteredTasks.value
    .filter((t) => {
      if (!t.dueDate) return false;
      try {
        return startOfDay(new Date(t.dueDate)).getTime() === dayStart;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    );
};

// ─── Helpers de style (couleur dynamique depuis la DB) ───────────────────────
const hexToRgba = (hex: string | null | undefined, alpha: number): string => {
  if (!hex) return `rgba(156,163,175,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const pillStyle = (task: Task) => {
  const color = task.privilege?.color ?? '#9ca3af'

  return {
    background: hexToRgba(color, 0.15),
    borderLeftColor: color,
    color: '#1f2937',
  }
}

const formatTime = (date: string | Date | null | undefined) =>
  date ? format(new Date(date), "HH:mm") : "";
</script>

<style scoped>
.cal-wrap {
  border: 0.5px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}

.cal-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
  gap: 8px;
}
.cal-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  min-width: 180px;
  text-align: center;
  text-transform: capitalize;
}
.cal-view-switch {
  display: flex;
  gap: 4px;
}

.cal-filters {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid #f3f4f6;
  background: #fafafa;
}

.cal-legend {
  display: flex;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-head {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
.head-cell {
  padding: 8px 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-right: 0.5px solid #f3f4f6;
}
.head-cell:last-child {
  border-right: none;
}

.day-cell {
  border-right: 0.5px solid #f3f4f6;
  border-bottom: 0.5px solid #f3f4f6;
  padding: 4px;
  background: white;
}
.day-cell:last-child {
  border-right: none;
}
.day-cell.other-month {
  background: #fafafa;
  opacity: 0.55;
}
.day-cell.today {
  background: #eef2ff;
}
.day-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 3px;
}
.today-badge {
  background: #4f46e5;
  color: white;
}

.task-pill {

  border-left: 4px solid transparent;
  border-radius: 4px;
  padding: 3px 5px;
  margin-bottom: 3px;
  cursor: pointer;
  font-size: 11px;
  transition: opacity 0.15s;
  overflow: hidden;
}
.task-pill:hover {
  opacity: 0.75;
}
.pill-time {
  font-size: 10px;
  opacity: 0.7;
}
.pill-title {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.pill-status {
  font-size: 10px;
  margin-top: 1px;
  opacity: 0.8;
}
.more-tasks {
  font-size: 10px;
  color: #9ca3af;
  padding: 1px 4px;
  cursor: pointer;
}
</style>
