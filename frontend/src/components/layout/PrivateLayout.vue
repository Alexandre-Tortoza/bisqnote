<script setup lang="ts">
import { useRoute } from 'vue-router'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const route = useRoute()

const navItems = [
  { name: 'board-home', label: 'HOME', icon: '⌂' },
  { name: 'board-invite', label: 'INVITE', icon: '✉' },
  { name: 'board-kanban', label: 'KANBAN', icon: '▦' },
  { name: 'board-calendar', label: 'CALENDAR', icon: '▦' },
  { name: 'board-chat', label: 'CHAT', icon: '◈' },
  { name: 'board-config', label: 'CONFIG', icon: '⚙' },
]
</script>

<template>
  <div class="min-h-screen bg-nb-bg text-nb-text flex flex-col">
    <!-- Top header -->
    <header class="border-b-2 border-nb-border bg-nb-surface h-14 flex items-center shrink-0">
      <div class="w-48 px-4 border-r-2 border-nb-border h-full flex items-center shrink-0">
        <RouterLink
          to="/"
          class="font-display text-base font-black tracking-tight text-nb-text hover:text-nb-accent transition-colors"
        >
          BISQNODE
        </RouterLink>
      </div>

      <div class="flex-1 px-6 flex items-center justify-between">
        <span class="font-display text-lg font-black tracking-tight">
          Board #{{ route.params['id'] }}
        </span>
        <ThemeToggle />
      </div>
    </header>

    <!-- Body: sidebar + content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-48 border-r-2 border-nb-border bg-nb-surface shrink-0 flex flex-col">
        <nav class="flex flex-col py-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name, params: { id: route.params['id'] } }"
            :class="[
              'flex items-center gap-3 px-4 py-2.5 font-mono text-xs font-bold transition-all border-l-4',
              route.name === item.name
                ? 'border-nb-accent text-nb-text bg-nb-bg'
                : 'border-transparent text-nb-muted hover:text-nb-text hover:border-nb-border hover:bg-nb-bg',
            ]"
          >
            <span class="text-base leading-none">{{ item.icon }}</span>
            {{ item.label }}
          </RouterLink>
        </nav>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
