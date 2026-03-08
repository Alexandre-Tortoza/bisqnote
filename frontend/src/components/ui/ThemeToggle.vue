<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore, type Theme } from '@/stores/theme'

const { t } = useI18n()
const themeStore = useThemeStore()

const options: { value: Theme; labelKey: string; icon: string }[] = [
  { value: 'light', labelKey: 'theme.light', icon: '☀' },
  { value: 'system', labelKey: 'theme.system', icon: '◑' },
  { value: 'dark', labelKey: 'theme.dark', icon: '●' },
]
</script>

<template>
  <div class="inline-flex border-2 border-nb-border" :role="'group'" :aria-label="t('theme.label')">
    <button
      v-for="opt in options"
      :key="opt.value"
      :aria-label="t(opt.labelKey)"
      :aria-pressed="themeStore.theme === opt.value"
      :class="[
        'px-3 py-1.5 font-mono text-xs transition-all border-r-2 border-nb-border last:border-r-0',
        themeStore.theme === opt.value
          ? 'bg-nb-border text-nb-bg'
          : 'bg-nb-surface text-nb-text hover:bg-nb-border hover:text-nb-bg',
      ]"
      @click="themeStore.setTheme(opt.value)"
    >
      {{ opt.icon }}
    </button>
  </div>
</template>
