<script setup lang="ts">
import { getPaginationRowModel } from '@tanstack/table-core'
import type { TableColumn } from '@nuxt/ui'
import type { User, Role } from '~/types'
import { h, ref, computed, watch } from 'vue'
import { useAuth } from '~~/composables/useAuth'

definePageMeta({ layout: 'dashboard' })

const { user } = useAuth()

const UAvatar       = resolveComponent('UAvatar')
const UButton       = resolveComponent('UButton')
const UBadge        = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox     = resolveComponent('UCheckbox')

const toast = useToast()
const table = ref()

// ─── Hiérarchie (UX uniquement — sécurité gérée par l'API) ───────────────────
const HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin:       3,
  manager:     2,
  user:        1,
}

const currentLevel = computed(() =>
  HIERARCHY[user.value?.role?.code ?? ''] ?? 0
)

// ─── Fetch ────────────────────────────────────────────────────────────────────
const { data, pending, refresh } = await useFetch<User[]>('/api/users', {
  default: () => [],
})
const { data: rolesData } = await useFetch<Role[]>('/api/roles', {
  default: () => [],
})

// Options filtrées : seulement les rôles strictement inférieurs au sien
const roleItems = computed(() =>
  (rolesData.value ?? [])
    .filter(r => (HIERARCHY[r.code] ?? 0) < currentLevel.value)
    .map(r => ({ label: r.label, value: r.id, code: r.code }))
)

// ─── Helpers UX (affichage uniquement) ───────────────────────────────────────
const canModify = (target: User): boolean => {
  if (!user.value) return false
  if (user.value.id === target.id) return false
  return currentLevel.value > (HIERARCHY[target.role?.code ?? ''] ?? 0)
}

const canDelete = (target: User): boolean => {
  if (!user.value) return false
  if (user.value.id === target.id) return false
  return currentLevel.value > (HIERARCHY[target.role?.code ?? ''] ?? 0)
}

// ─── Changement de rôle ───────────────────────────────────────────────────────
const roleLoading = ref<string | null>(null)

async function updateRole(userId: string, userName: string, roleId: number | null) {
  if (!roleId) return
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
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.data?.statusMessage ?? 'Impossible de modifier le rôle.',
      color: 'error',
    })
  } finally {
    roleLoading.value = null
  }
}

// ─── Suppression ─────────────────────────────────────────────────────────────
// La sécurité est entièrement gérée par l'API DELETE
// Le front ne fait que afficher l'erreur retournée
const deleteLoading = ref<string | null>(null)

async function deleteUser(id: string, name: string) {
  if (!confirm(`Supprimer « ${name} » ? Cette action est irréversible.`)) return
  deleteLoading.value = id
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    toast.add({
      title: 'Utilisateur supprimé',
      description: `${name} a été supprimé.`,
      color: 'success',
    })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Impossible de supprimer',
      description: e?.data?.statusMessage ?? 'Une erreur est survenue.',
      color: 'error',
    })
  } finally {
    deleteLoading.value = null
  }
}

// Suppression en masse — on tente tout, l'API filtre côté serveur
async function deleteBulk() {
  const rows = table.value?.tableApi
    ?.getFilteredSelectedRowModel().rows ?? []

  if (!rows.length) return

  const results = await Promise.allSettled(
    rows.map((r: any) => deleteUser(r.original.id, r.original.name))
  )

  const failed = results.filter(r => r.status === 'rejected').length
  if (failed > 0) {
    toast.add({
      title: `${failed} suppression(s) refusée(s)`,
      description: 'Certains utilisateurs ne peuvent pas être supprimés.',
      color: 'warning',
    })
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

// ─── Styles couleur rôle ──────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  admin:       { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
  manager:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200'  },
  user:        { bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200'   },
}
const DEFAULT_STYLE = { bg: 'bg-gray-50', text: 'text-gray-400', border: 'border-gray-200' }

const blockTitle = (target: User): string => {
  if (user.value?.id === target.id) return 'Vous ne pouvez pas modifier votre propre rôle'
  if (!canModify(target))           return 'Permissions insuffisantes'
  if (roleItems.value.length === 0) return 'Aucun rôle disponible'
  return ''
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

  {
    accessorKey: 'role',
    header: 'Rôle',
    filterFn: (row, _id, filterValue) => row.original.role?.label === filterValue,
    cell: ({ row }) => {
      const target        = row.original
      const currentRoleId = target.role?.id ?? null
      const isLoading     = roleLoading.value === target.id
      const modifiable    = canModify(target) && roleItems.value.length > 0
      const isDisabled    = isLoading || !modifiable
      const style         = COLOR_MAP[target.role?.code ?? ''] ?? DEFAULT_STYLE
      const tooltip       = blockTitle(target)

      return h('div', { class: 'flex items-center gap-2' }, [
        h('div', { class: 'relative', title: tooltip }, [
          h('select', {
            value:    currentRoleId ?? '',
            disabled: isDisabled,
            class: [
              'appearance-none rounded-md px-2.5 py-1 text-xs font-semibold border outline-none transition-colors duration-150',
              style.bg, style.text, style.border,
              isDisabled
                ? 'opacity-60 cursor-not-allowed'
                : 'cursor-pointer hover:opacity-80 focus:ring-2 focus:ring-offset-1 focus:ring-primary-300',
              !modifiable ? 'pr-6' : '',
            ].join(' '),
            onChange: (e: Event) => {
              const raw       = (e.target as HTMLSelectElement).value
              const newRoleId = raw === '' ? null : Number(raw)
              if (newRoleId !== currentRoleId) {
                updateRole(target.id, target.name, newRoleId)
              }
            },
          }, [
            // Option courante (toujours visible, désactivée si on peut changer)
            h('option', {
              value:    currentRoleId ?? '',
              disabled: modifiable,
              hidden:   modifiable,
            }, target.role?.label ?? 'Aucun rôle'),

            // Options disponibles
            ...roleItems.value.map(item =>
              h('option', {
                value:    item.value ?? '',
                selected: item.value === currentRoleId,
              }, item.label)
            ),
          ]),

          // Icône cadenas si non modifiable
          !modifiable
            ? h('span', {
                class: 'pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300',
              },
                h('svg', {
                  width: 10, height: 10, viewBox: '0 0 24 24',
                  fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
                }, [
                  h('rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
                  h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
                ])
              )
            : null,
        ]),

        // Spinner chargement rôle
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
    cell: ({ row }) => {
      const target    = row.original
      const deletable = canDelete(target)
      const isLoading = deleteLoading.value === target.id

      return h('div', { class: 'flex justify-end' },
        h(UButton, {
          icon:      'i-lucide-trash',
          color:     'error',
          variant:   'ghost',
          size:      'sm',
          loading:   isLoading,
          // Désactivé visuellement (UX) — l'API bloque de toute façon
          disabled:  !deletable || isLoading,
          title:     !deletable
            ? user.value?.id === target.id
              ? 'Vous ne pouvez pas vous supprimer'
              : 'Permissions insuffisantes'
            : 'Supprimer',
          ariaLabel: 'Supprimer',
          class:     !deletable ? 'opacity-30 cursor-not-allowed' : '',
          onClick:   () => deleteUser(target.id, target.name),
        })
      )
    },
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
            @click="deleteBulk"
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