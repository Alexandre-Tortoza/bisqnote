<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const props = defineProps<{
  serverError?: string | null
}>()

const emit = defineEmits<{
  save: [{ name: string; url: string }]
  close: []
}>()

const { t } = useI18n()

const name = ref('')
const url = ref('')
const nameError = ref('')
const urlError = ref('')

function validate(): boolean {
  nameError.value = ''
  urlError.value = ''
  if (!name.value.trim()) { nameError.value = t('files.errorNameRequired'); return false }
  if (!url.value.trim()) { urlError.value = t('files.errorUrlRequired'); return false }
  return true
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function handleSave() {
  if (!validate()) return
  emit('save', { name: name.value.trim(), url: normalizeUrl(url.value) })
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="border-2 border-nb-border bg-nb-surface w-full max-w-md shadow-[var(--nb-shadow)]">
      <!-- Header -->
      <div class="border-b-2 border-nb-border px-4 py-3 flex items-center justify-between">
        <span class="font-mono text-xs font-bold uppercase tracking-wider">{{ t('files.addLinkTitle') }}</span>
        <button
          class="font-mono text-xs text-nb-muted hover:text-nb-text"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 flex flex-col gap-4">
        <p v-if="props.serverError" class="border-2 border-red-500 bg-red-50 dark:bg-red-950 px-3 py-2 font-mono text-xs text-red-700 dark:text-red-300">
          {{ props.serverError }}
        </p>
        <AppInput
          v-model="name"
          :label="t('files.labelName')"
          :placeholder="t('files.placeholderName')"
          :error="nameError"
        />
        <AppInput
          v-model="url"
          :label="t('files.labelUrl')"
          :placeholder="t('files.placeholderUrl')"
          :error="urlError"
        />
      </div>

      <!-- Footer -->
      <div class="border-t-2 border-nb-border px-4 py-3 flex items-center justify-end gap-2">
        <AppButton variant="ghost" size="sm" @click="emit('close')">{{ t('files.cancel') }}</AppButton>
        <AppButton size="sm" @click="handleSave">{{ t('files.save') }}</AppButton>
      </div>
    </div>
  </div>
</template>
