<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'md', disabled: false },
)

const base =
  'inline-flex items-center justify-center font-mono font-bold border-2 border-nb-border transition-all duration-100 cursor-pointer select-none active:translate-x-1 active:translate-y-1 active:shadow-none'

const variants: Record<Variant, string> = {
  primary:
    'bg-nb-accent text-white shadow-[var(--nb-accent-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none',
  secondary:
    'bg-nb-surface text-nb-text shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none',
  ghost: 'bg-transparent text-nb-text border-transparent hover:border-nb-border',
  danger:
    'bg-red-700 text-white border-nb-border shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const classes = computed(() => [
  base,
  variants[props.variant],
  sizes[props.size],
  props.disabled && 'opacity-40 pointer-events-none',
])
</script>

<template>
  <button :class="classes" :disabled="disabled" v-bind="$attrs">
    <slot />
  </button>
</template>
