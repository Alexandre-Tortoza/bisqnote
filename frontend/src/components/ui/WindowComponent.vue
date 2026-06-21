<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ title: string }>()
defineSlots<{
  'minimize-btn'?: () => unknown
  'maximize-btn'?: () => unknown
  'close-btn'?: () => unknown
  default: () => unknown
}>()

const { t } = useI18n()
</script>

<template>
  <div class="border-2 border-nb-border shadow-[var(--nb-shadow-lg)] bg-nb-surface mb-6">
    <div class="flex items-center justify-between border-b-2 border-nb-border bg-nb-border px-3 py-1.5">
      <span class="font-mono text-xs font-bold text-nb-bg uppercase tracking-widest">{{ title }}</span>
      <div class="flex items-center gap-1">
        <slot name="minimize-btn">
          <button
            class="w-5 h-5 border-2 border-nb-bg text-nb-bg font-mono text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-default"
            tabindex="-1"
            :aria-label="t('window.minimize')"
          >─</button>
        </slot>
        <slot name="maximize-btn">
          <button
            class="w-5 h-5 border-2 border-nb-bg text-nb-bg font-mono text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-default"
            tabindex="-1"
            :aria-label="t('window.maximize')"
          >□</button>
        </slot>
        <slot name="close-btn">
          <button
            class="w-5 h-5 border-2 border-nb-bg text-nb-bg font-mono text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-default"
            tabindex="-1"
            :aria-label="t('window.close')"
          >✕</button>
        </slot>
      </div>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>
