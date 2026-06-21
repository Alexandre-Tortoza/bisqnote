<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  placeholder?: string
  modelValue?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      :placeholder="placeholder"
      class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 placeholder:text-nb-muted w-full"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <span v-if="error" class="font-mono text-xs text-red-600 font-bold">{{ error }}</span>
  </div>
</template>
