<script setup lang="ts">
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
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

        <!-- Nav + toggle -->
        <div class="flex items-center gap-1">
          <nav class="flex items-center">
            <RouterLink
              v-for="{ to, label } in [
                { to: '/', label: 'HOME' },
                { to: '/create', label: 'CREATE' },
                { to: '/join', label: 'JOIN' },
              ]"
              :key="to"
              :to="to"
              class="font-mono text-xs font-bold px-3 py-1.5 text-nb-muted hover:text-nb-text hover:bg-nb-border hover:text-nb-bg border-2 border-transparent hover:border-nb-border transition-all"
              active-class="text-nb-bg bg-nb-border border-nb-border"
              exact-active-class="text-nb-bg bg-nb-border border-nb-border"
            >
              {{ label }}
            </RouterLink>
          </nav>

          <div class="ml-3 border-l-2 border-nb-border pl-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
