import { defineStore } from 'pinia'
import { computed } from 'vue'
import { i18n } from '@/plugins/i18n'

export type Locale = 'en' | 'pt-BR'

const STORAGE_KEY = 'bisqnode-locale'

export const useLocaleStore = defineStore('locale', () => {
  const locale = computed<Locale>(() => i18n.global.locale.value as Locale)

  function setLocale(next: Locale) {
    i18n.global.locale.value = next
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return { locale, setLocale }
})
