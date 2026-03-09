<script setup lang="ts">
import { useI18n } from "vue-i18n";
import ThemeToggle from "@/components/ui/ThemeToggle.vue";
import LocaleToggle from "@/components/ui/LocaleToggle.vue";

const { t } = useI18n();
</script>

<template>
  <div class="min-h-screen bg-nb-bg text-nb-text flex flex-col">
    <!-- Header -->
    <header class="border-b-2 border-nb-border bg-nb-surface">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        <!-- Logo -->
        <RouterLink
          to="/"
          class="font-display text-xl font-black tracking-tight text-nb-text hover:text-nb-accent transition-colors"
        >
          BISQNODE
        </RouterLink>

        <!-- Nav + toggles -->
        <div class="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
