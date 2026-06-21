<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocaleStore, type Locale } from '@/stores/locale'

const { t } = useI18n()
const localeStore = useLocaleStore()

const open = ref(false)

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'pt-BR', label: 'PT' },
]

const labels: Record<Locale, string> = { en: 'EN', 'pt-BR': 'PT' }

function select(locale: Locale) {
  localeStore.setLocale(locale)
  open.value = false
}
</script>

<template>
  <div class="relative">
    <button
      data-trigger
      :aria-label="t('lang.label')"
      :title="t('lang.label')"
      class="px-3 py-1.5 font-mono text-xs border-2 border-nb-border bg-nb-surface text-nb-text hover:bg-nb-border hover:text-nb-bg transition-all"
      @click="open = !open"
    >
      {{ labels[localeStore.locale] }}
    </button>

    <div
      v-if="open"
      data-dropdown
      class="absolute right-0 top-full mt-1 border-2 border-nb-border bg-nb-surface shadow-[var(--nb-shadow-md)] z-50 min-w-[4rem]"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        data-option
        :aria-pressed="localeStore.locale === opt.value"
        :class="[
          'block w-full text-left px-3 py-1.5 font-mono text-xs transition-all',
          localeStore.locale === opt.value
            ? 'bg-nb-border text-nb-bg'
            : 'text-nb-text hover:bg-nb-border hover:text-nb-bg',
        ]"
        @click="select(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
