<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const open = ref(false);

const links = [
  [
    {
      label: "Tâches",
      icon: "i-lucide-check-square",
      to: "/",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Créer une tâche",
      icon: "i-lucide-plus-square",
      to: "/tasks/new",
      badge: "4",
      onSelect: () => {
        open.value = false;
      },
    },
    {
      label: "Utilisateurs",
      icon: "i-lucide-users",
      to: "/users",
      onSelect: () => {
        open.value = false;
      },
    },
  ],
  
] satisfies NavigationMenuItem[][];

const groups = computed(() => [
  {
    id: "links",
    label: "Go to",
    items: links.flat(),
  },
  {
    id: "code",
    label: "Code",
    items: [
      {
        id: "source",
        label: "View page source",
        icon: "i-simple-icons-github",
        to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === "/" ? "/index" : route.path}.vue`,
        target: "_blank",
      },
    ],
  },
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
          :items="links[0]"
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

    <UDashboardSearch :groups="groups" />

    <slot />

  </UDashboardGroup>
</template>
