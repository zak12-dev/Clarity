<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";
import { useAuth } from "~~/composables/useAuth";

const route = useRoute();
const toast = useToast();

const open = ref(false);
const { user } = useAuth();

const isAdmin = computed(() => {
  return Number(user.value?.role?.id ?? 0) === 1;
});
const mainLinks = computed(() => links.value[0]);
const links = computed(() => [
  [
    {
      label: "Tâches",
      icon: "i-lucide-check-square",
      to: "/",
      onSelect: () => (open.value = false),
    },
    {
      label: "Créer une tâche",
      icon: "i-lucide-plus-square",
      to: "/tasks/new",
      onSelect: () => (open.value = false),
    },

    // 🔥 visible seulement admin
    ...(isAdmin.value
      ? [
          {
            label: "Utilisateurs",
            icon: "i-lucide-users",
            to: "/users",
            onSelect: () => (open.value = false),
          },
        ]
      : []),
  ],
]);

onMounted(async () => {
  const cookie = useCookie("cookie-consent");
  if (cookie.value === "accepted") {
    return;
  }

  toast.add({
    title:
      " Nous utilisons des cookies propriétaires pour améliorer votre expérience sur notre site web.",
    duration: 0,
    close: false,
    actions: [
      {
        label: "Accepter",
        color: "neutral",
        variant: "outline",
        onClick: () => {
          cookie.value = "accepted";
        },
      },
      {
        label: "Se désinscrire ",
        color: "neutral",
        variant: "ghost",
      },
    ],
  });
});
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainLinks"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch />

    <slot />
  </UDashboardGroup>
</template>
