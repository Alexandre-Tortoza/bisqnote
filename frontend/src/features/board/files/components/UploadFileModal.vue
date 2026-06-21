<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'

const MAX_BYTES = 10_485_760

const props = defineProps<{
  serverError?: string | null
}>()

const emit = defineEmits<{
  save: [{ name: string; file: File }]
  close: []
}>()

const { t } = useI18n()

const name = ref('')
const file = ref<File | null>(null)
const nameError = ref('')
const fileError = ref('')

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = input.files?.[0] ?? null
  file.value = chosen
  if (chosen) {
    if (!name.value.trim()) name.value = chosen.name
    if (chosen.size > MAX_BYTES) {
      fileError.value = t('files.errorFileTooLarge')
    } else {
      fileError.value = ''
    }
  }
}

function validate(): boolean {
  nameError.value = ''
  fileError.value = ''
  if (!file.value) { fileError.value = t('files.errorFileRequired'); return false }
  if (file.value.size > MAX_BYTES) { fileError.value = t('files.errorFileTooLarge'); return false }
  if (!name.value.trim()) { nameError.value = t('files.errorNameRequired'); return false }
  return true
}

function handleUpload() {
  if (!validate()) return
  emit('save', { name: name.value.trim(), file: file.value! })
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
        <span class="font-mono text-xs font-bold uppercase tracking-wider">{{ t('files.uploadFileTitle') }}</span>
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
        <!-- File picker -->
        <div>
          <label class="block font-mono text-xs font-bold text-nb-text mb-1">
            {{ t('files.labelFile') }}
          </label>
          <label
            class="block border-2 border-dashed border-nb-border bg-nb-bg hover:bg-nb-surface cursor-pointer px-3 py-4 text-center transition-colors"
          >
            <span class="font-mono text-xs text-nb-muted">
              {{ file ? file.name : '+ Choose file' }}
            </span>
            <input type="file" class="sr-only" @change="onFileChange" />
          </label>
          <p v-if="fileError" class="mt-1 font-mono text-xs text-red-600">{{ fileError }}</p>
        </div>

        <AppInput
          v-model="name"
          :label="t('files.labelName')"
          :placeholder="t('files.placeholderName')"
          :error="nameError"
        />
      </div>

      <!-- Footer -->
      <div class="border-t-2 border-nb-border px-4 py-3 flex items-center justify-end gap-2">
        <AppButton variant="ghost" size="sm" @click="emit('close')">{{ t('files.cancel') }}</AppButton>
        <AppButton size="sm" @click="handleUpload">{{ t('files.upload') }}</AppButton>
      </div>
    </div>
  </div>
</template>
