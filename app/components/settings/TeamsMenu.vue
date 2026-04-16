<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <NuxtLink to="/" class="brand-logo">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
      <span class="text-white font-bold text-sm">C</span>
    </div>

          <span class="brand-name">Clarity</span>
        </NuxtLink>
</template>
<style scoped>
.brand-logo {
  display: inline-flex; align-items: center; gap: 10px;
  text-decoration: none;
}.brand-name {
  font-size: 30px; font-weight: 700; letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--orange), var(--purple));
  -webkit-background-clip: text; -webkit-text-fill-color: black;
}
</style>