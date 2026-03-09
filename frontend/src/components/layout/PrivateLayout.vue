<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const { t } = useI18n()
const userStore = useUserStore()

const navItems = [
  { name: 'board-home', key: 'home', icon: '⌂' },
  { name: 'board-invite', key: 'invite', icon: '✉' },
  { name: 'board-kanban', key: 'kanban', icon: '▦' },
  { name: 'board-calendar', key: 'calendar', icon: '▦' },
  { name: 'board-chat', key: 'chat', icon: '◈' },
  { name: 'board-config', key: 'config', icon: '⚙' },
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
          {{ t('board.title', { id: route.params['id'] }) }}
        </span>
        <div class="flex items-center gap-1">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <!-- Body: sidebar + content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-48 border-r-2 border-nb-border bg-nb-surface shrink-0 flex flex-col">
        <nav class="flex flex-col gap-1 p-2 flex-1">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="{ name: item.name, params: { id: route.params['id'] } }"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 font-mono text-xs font-bold transition-all border-2',
              route.name === item.name
                ? 'border-nb-accent bg-nb-bg text-nb-text'
                : 'border-transparent text-nb-muted hover:text-nb-text hover:border-nb-border hover:bg-nb-bg',
            ]"
          >
            <span class="text-base leading-none">{{ item.icon }}</span>
            {{ t(`board.nav.${item.key}`) }}
          </RouterLink>
        </nav>

        <!-- User info -->
        <div class="border-t-2 border-nb-border px-3 py-3 flex items-center gap-2 shrink-0">
          <div class="w-7 h-7 border-2 border-nb-border bg-nb-bg flex items-center justify-center shrink-0">
            <span class="font-mono text-xs font-bold leading-none">◉</span>
          </div>
          <span class="font-mono text-xs font-bold text-nb-text truncate">
            {{ userStore.user?.username ?? '—' }}
          </span>
        </div>
      </aside>

      <!-- Main content -->
      <main class="flex-1 overflow-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>
