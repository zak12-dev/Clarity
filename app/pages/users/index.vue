
<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/table-core'
import type { Row } from '@tanstack/table-core'
import type { TableColumn } from '@nuxt/ui'
import type { User } from '~/types'
import { h, ref, computed, watch } from 'vue'

definePageMeta({ layout: 'dashboard' })

// ─── Composants résolus pour le rendu h() ─────────────────────────────────────
const UAvatar        = resolveComponent('UAvatar')
const UButton        = resolveComponent('UButton')
const UBadge         = resolveComponent('UBadge')
const UDropdownMenu  = resolveComponent('UDropdownMenu')
const UCheckbox      = resolveComponent('UCheckbox')

const toast = useToast()
const table = ref()
// ─── Fetch utilisateurs ───────────────────────────────────────────────────────
const { data, pending, refresh } = await useFetch<User[]>('/api/users', {
  default: () => [],
})

// ─── Suppression ──────────────────────────────────────────────────────────────
const deleteLoading = ref<string | null>(null)

async function deleteUser(id: string, name: string) {
  if (!confirm(`Supprimer l'utilisateur « ${name} » ? Cette action est irréversible.`)) return

  deleteLoading.value = id
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Utilisateur supprimé',
      description: `${name} a été supprimé avec succès.`,
      color: 'success',
    })
    await refresh()
  } catch {
    toast.add({
      title: 'Erreur',
      description: "Impossible de supprimer l'utilisateur.",
      color: 'error',
    })
  } finally {
    deleteLoading.value = null
  }
}

// ─── Filtres ──────────────────────────────────────────────────────────────────
const search      = ref('')
const roleFilter  = ref('all')
const pagination  = ref({ pageIndex: 0, pageSize: 10 })
const rowSelection = ref({})

const columnFilters    = ref([{ id: 'name', value: '' }])
const columnVisibility = ref({})

// Sync recherche → colonne name
const nameFilter = computed({
  get: () => (table.value?.tableApi?.getColumn('name')?.getFilterValue() as string) ?? '',
  set: (v) => table.value?.tableApi?.getColumn('name')?.setFilterValue(v || undefined),
})

watch(search, (v) => { nameFilter.value = v })

// Sync filtre rôle → colonne role
watch(roleFilter, (v) => {
  const col = table.value?.tableApi?.getColumn('role')
  if (!col) return
  col.setFilterValue(v === 'all' ? undefined : v)
})

// ─── Options rôles dynamiques ─────────────────────────────────────────────────
const roleOptions = computed(() => {
  const roles = [...new Set(
    (data.value ?? []).map(u => u.role?.label).filter(Boolean)
  )]
  return [
    { label: 'Tous les rôles', value: 'all' },
    ...roles.map(r => ({ label: r!, value: r! })),
  ]
})

// ─── Colonnes ─────────────────────────────────────────────────────────────────
const columns: TableColumn<User>[] = [
  {
    id: 'select',
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Tout sélectionner',
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Sélectionner la ligne',
      }),
  },
  {
    accessorKey: 'name',
    header: 'Utilisateur',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, {
          src:  row.original.image ?? undefined,
          alt:  row.original.name,
          size: 'sm',
        }),
        h('div', undefined, [
          h('p', { class: 'font-medium text-highlighted leading-tight' }, row.original.name),
          h('p', { class: 'text-xs text-muted' }, row.original.email),
        ]),
      ]),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Rôle',
    filterFn: (row, _id, filterValue) =>
      row.original.role?.label === filterValue,
    cell: ({ row }) => {
      const label = row.original.role?.label ?? 'Aucun'
      const color = row.original.role?.code === 'admin' ? 'primary' : 'neutral'
      return h(UBadge, { variant: 'subtle', color, class: 'capitalize' }, () => label)
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
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
      }),
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end' },
        h(UButton, {
          icon:    'i-lucide-trash',
          color:   'error',
          variant: 'ghost',
          size:    'sm',
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
            @click="
              Promise.all(
                table!.tableApi!
                  .getFilteredSelectedRowModel()
                  .rows.map(r => deleteUser(r.original.id, r.original.name))
              )
            "
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
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((col: any) => col.getCanHide())
                .map((col: any) => ({
                  label: col.id,
                  type: 'checkbox' as const,
                  checked: col.getIsVisible(),
                  onUpdateChecked: (v: boolean) => col.toggleVisibility(!!v),
                  onSelect: (e?: Event) => e?.preventDefault(),
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Colonnes"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
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