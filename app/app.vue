<script setup lang="ts">
import { useAuth } from '../composables/useAuth'

const { fetchSession, session } = useAuth()

// ✅ await au top-level — session chargée AVANT le rendu de l'arbre
await fetchSession()
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtRouteAnnouncer />
      <NuxtLoadingIndicator />
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>