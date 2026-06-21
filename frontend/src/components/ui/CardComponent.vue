<script setup lang="ts">
defineProps<{ title?: string }>()
defineSlots<{
  header?: () => unknown
  default: () => unknown
  footer?: () => unknown
}>()
</script>

<template>
  <div class="border-2 border-nb-border shadow-[var(--nb-shadow-lg)] bg-nb-surface mb-6">
    <div v-if="title || $slots.header" class="border-b-2 border-nb-border px-4 py-2 bg-nb-border">
      <slot name="header">
        <span class="font-mono text-xs font-bold text-nb-bg uppercase tracking-widest">{{ title }}</span>
      </slot>
    </div>
    <div class="p-6">
      <slot />
    </div>
    <div v-if="$slots.footer" class="border-t-2 border-nb-border px-4 py-3">
      <slot name="footer" />
    </div>
  </div>
</template>
