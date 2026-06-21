<script setup lang="ts">
type Variant = 'default' | 'accent' | 'outline'

withDefaults(defineProps<{ variant?: Variant }>(), { variant: 'default' })

const variants: Record<Variant, string> = {
  default: 'bg-nb-border text-nb-bg',
  accent: 'bg-nb-accent text-white border-nb-accent',
  outline: 'bg-transparent text-nb-text border-nb-border',
}
</script>

<template>
  <span
    :class="['inline-block font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-2', variants[variant]]"
  >
    <slot />
  </span>
</template>
