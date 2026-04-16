<script setup lang="ts">

import { useAuth } from '../composables/useAuth'

const { fetchSession, session } = useAuth()

onMounted(async () => {
  await fetchSession()
})

watchEffect(() => {
  console.log("SESSION =>", session.value)
})
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