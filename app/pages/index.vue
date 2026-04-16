<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import auth from '~~/middleware/auth.global'
definePageMeta({
  layout: 'dashboard',
  middleware: [auth] 
})



const items = [[{
  label: 'Créer une tâche',
  icon: 'i-lucide-plus-square',
  to: '/tasks/new'
}]] satisfies DropdownMenuItem[][]


</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
         

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <HomeStats />
      <HomeChart />
      <HomeSales />
    </template>
  </UDashboardPanel>
</template>
