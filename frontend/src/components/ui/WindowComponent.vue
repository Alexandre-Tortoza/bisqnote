<script setup lang="ts">
defineProps<{ title: string }>()
defineSlots<{
  'minimize-btn'?: () => unknown
  'maximize-btn'?: () => unknown
  'close-btn'?: () => unknown
  default: () => unknown
}>()
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
            aria-label="Minimize"
          >─</button>
        </slot>
        <slot name="maximize-btn">
          <button
            class="w-5 h-5 border-2 border-nb-bg text-nb-bg font-mono text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-default"
            tabindex="-1"
            aria-label="Maximize"
          >□</button>
        </slot>
        <slot name="close-btn">
          <button
            class="w-5 h-5 border-2 border-nb-bg text-nb-bg font-mono text-xs leading-none flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-default"
            tabindex="-1"
            aria-label="Close"
          >✕</button>
        </slot>
      </div>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>
