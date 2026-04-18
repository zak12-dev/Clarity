<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/table-core'
import type { TableColumn } from '@nuxt/ui'
import type { User, Role } from '~/types'
import { h, ref, computed, watch } from 'vue'

definePageMeta({ layout: 'dashboard' })

const UAvatar       = resolveComponent('UAvatar')
const UButton       = resolveComponent('UButton')
const UBadge        = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox     = resolveComponent('UCheckbox')
const USelect       = resolveComponent('USelect')

const toast = useToast()
const table = ref()

// ─── Fetch ────────────────────────────────────────────────────────────────────
const { data, pending, refresh } = await useFetch<User[]>('/api/users', {
  default: () => [],
})
const { data: rolesData } = await useFetch<Role[]>('/api/roles', {
  default: () => [],
})

const roleItems = computed(() => [
  { label: 'Aucun rôle', value: null },
  ...(rolesData.value ?? []).map(r => ({ label: r.label, value: r.id, code: r.code })),
])

// ─── Changement de rôle ───────────────────────────────────────────────────────
const roleLoading = ref<string | null>(null)

async function updateRole(userId: string, userName: string, roleId: number | null) {
  roleLoading.value = userId
  try {
    await $fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { roleId },
    })
    toast.add({
      title: 'Rôle mis à jour',
      description: `Le rôle de ${userName} a été modifié.`,
      color: 'success',
    })
    await refresh()
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de modifier le rôle.',
      color: 'error',
    })
  } finally {
    roleLoading.value = null
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
const deleteLoading = ref<string | null>(null)

async function deleteUser(id: string, name: string) {
  if (!confirm(`Supprimer « ${name} » ? Cette action est irréversible.`)) return
  deleteLoading.value = id
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Utilisateur supprimé', description: `${name} supprimé.`, color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: 'Erreur', description: "Impossible de supprimer l'utilisateur.", color: 'error' })
  } finally {
    deleteLoading.value = null
  }
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
const search       = ref('')
const roleFilter   = ref('all')
const pagination   = ref({ pageIndex: 0, pageSize: 10 })
const rowSelection = ref({})
const columnFilters    = ref([{ id: 'name', value: '' }])
const columnVisibility = ref({})

watch(search, (v) => {
  table.value?.tableApi?.getColumn('name')?.setFilterValue(v || undefined)
})
watch(roleFilter, (v) => {
  table.value?.tableApi?.getColumn('role')?.setFilterValue(v === 'all' ? undefined : v)
})

const roleOptions = computed(() => {
  const labels = [...new Set((data.value ?? []).map(u => u.role?.label).filter(Boolean))]
  return [
    { label: 'Tous les rôles', value: 'all' },
    ...labels.map(l => ({ label: l!, value: l! })),
  ]
})

// ─── Couleur badge par code rôle ──────────────────────────────────────────────
const roleColor = (code?: string | null) => {
  const map: Record<string, string> = {
    admin:   'primary',
    manager: 'warning',
    user:    'neutral',
  }
  return (code ? map[code] : null) ?? 'neutral'
}

// ─── Colonnes ─────────────────────────────────────────────────────────────────
const columns: TableColumn<User>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Tout sélectionner',
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Sélectionner',
      }),
  },
  {
    accessorKey: 'name',
    header: 'Utilisateur',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { src: row.original.image ?? undefined, alt: row.original.name, size: 'sm' }),
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted leading-tight' }, row.original.name),
          h('p', { class: 'text-xs text-muted' }, row.original.email),
        ]),
      ]),
  },
  // Remplacez uniquement la colonne 'role' dans votre tableau columns[]

{
  accessorKey: 'role',
  header: 'Rôle',
  filterFn: (row, _id, filterValue) => row.original.role?.label === filterValue,
  cell: ({ row }) => {
    const user = row.original
    const currentRoleId = user.role?.id ?? null
    const isLoading = roleLoading.value === user.id

    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      admin:   { bg: 'bg-primary-50',  text: 'text-primary-700',  border: 'border-primary-200'  },
      manager: { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200'    },
      user:    { bg: 'bg-gray-50',     text: 'text-gray-600',     border: 'border-gray-200'     },
    }
    const style = colorMap[user.role?.code ?? ''] ?? { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' }

    return h('div', { class: 'flex items-center gap-2' }, [
      h('select', {
        value: currentRoleId ?? '',
        disabled: isLoading,
        class: [
          'appearance-none rounded-md px-2.5 py-1 text-xs font-semibold border cursor-pointer outline-none',
          'transition-colors duration-150 focus:ring-2 focus:ring-offset-1 focus:ring-primary-300',
          style.bg, style.text, style.border,
          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80',
        ].join(' '),
        onChange: (e: Event) => {
          const raw = (e.target as HTMLSelectElement).value
          const newRoleId = raw === '' ? null : Number(raw)
          if (newRoleId !== currentRoleId) {
            updateRole(user.id, user.name, newRoleId)
          }
        },
      },
        roleItems.value.map(item =>
          h('option', {
            value: item.value ?? '',
            selected: (item.value ?? null) === currentRoleId,
          }, item.label)
        )
      ),

      // Spinner
      isLoading
        ? h('svg', {
            class: 'w-3.5 h-3.5 animate-spin text-primary-500 shrink-0',
            fill: 'none', viewBox: '0 0 24 24',
          }, [
            h('circle', { class: 'opacity-25', cx: 12, cy: 12, r: 10, stroke: 'currentColor', 'stroke-width': 4 }),
            h('path', { class: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' }),
          ])
        : null,
    ])
  },
},
  {
    accessorKey: 'emailVerified',
    header: 'Email vérifié',
    cell: ({ row }) =>
      h(UBadge, {
        variant: 'subtle',
        color: row.original.emailVerified ? 'success' : 'warning',
      }, () => row.original.emailVerified ? 'Vérifié' : 'Non vérifié'),
  },
  {
    accessorKey: 'createdAt',
    header: 'Créé le',
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end' },
        h(UButton, {
          icon: 'i-lucide-trash',
          color: 'error',
          variant: 'ghost',
          size: 'sm',
          loading: deleteLoading.value === row.original.id,
          ariaLabel: 'Supprimer',
          onClick: () => deleteUser(row.original.id, row.original.name),
        })
      ),
  },
]
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Utilisateurs">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Barre de filtres -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
        <UInput
          v-model="search"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="Rechercher un utilisateur..."
        />

        <div class="flex flex-wrap items-center gap-2">
          <!-- Suppression en masse -->
          <UButton
            v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
            label="Supprimer la sélection"
            color="error"
            variant="subtle"
            icon="i-lucide-trash"
            :loading="deleteLoading !== null"
            @click="Promise.all(
              table.tableApi
                .getFilteredSelectedRowModel()
                .rows.map((r: any) => deleteUser(r.original.id, r.original.name))
            )"
          >
            <template #trailing>
              <UKbd>{{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}</UKbd>
            </template>
          </UButton>

          <!-- Filtre rôle -->
          <USelect
            v-model="roleFilter"
            :items="roleOptions"
            placeholder="Filtrer par rôle"
            class="min-w-36"
          />

          <!-- Colonnes visibles -->
          <UDropdownMenu
            :items="table?.tableApi
              ?.getAllColumns()
              .filter((col: any) => col.getCanHide())
              .map((col: any) => ({
                label: col.id,
                type: 'checkbox' as const,
                checked: col.getIsVisible(),
                onUpdateChecked: (v: boolean) => col.toggleVisibility(!!v),
                onSelect: (e?: Event) => e?.preventDefault(),
              }))"
            :content="{ align: 'end' }"
          >
            <UButton label="Colonnes" color="neutral" variant="outline" trailing-icon="i-lucide-settings-2" />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Tableau -->
      <UTable
        ref="table"
        v-model:column-filters="columnFilters"
        v-model:column-visibility="columnVisibility"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        :data="data ?? []"
        :columns="columns"
        :loading="pending"
        class="shrink-0"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
      />

      <!-- Footer pagination -->
      <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-auto">
        <p class="text-sm text-muted">
          {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length ?? 0 }} sélectionné(s) sur
          {{ table?.tableApi?.getFilteredRowModel().rows.length ?? 0 }} utilisateur(s)
        </p>
        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex ?? 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>