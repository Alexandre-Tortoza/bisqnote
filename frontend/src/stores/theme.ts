import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'bisqnode-theme'

export const useThemeStore = defineStore('theme', () => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const theme = ref<Theme>((stored as Theme | null) ?? 'system')

  const systemDark = ref(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  )

  const resolvedTheme = computed<'light' | 'dark'>(() =>
    theme.value === 'system' ? (systemDark.value ? 'dark' : 'light') : theme.value,
  )

  function setTheme(next: Theme) {
    theme.value = next
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }

  function init() {
    if (typeof window === 'undefined') return
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemDark.value = e.matches
    })
  }

  watch(
    resolvedTheme,
    (val) => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', val === 'dark')
      }
    },
    { immediate: true, flush: 'sync' },
  )

  return { theme, resolvedTheme, setTheme, init }
})
